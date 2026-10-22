-- 截图记账也能记“进账”：别人转钱给你、退款、帮人付款后对方还钱……
-- capture_transaction 多了 p_type（'expense' 或 'income'）。旧版本（9 个参数）要先删掉，免得两个版本并存。

drop function if exists public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean);

create or replace function public.capture_transaction(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_category_label text,
  p_occurred_on date,
  p_raw_text text,
  p_original_amount numeric default null,
  p_original_currency text default null,
  p_uncertain boolean default false,
  p_type text default 'expense'
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_asset uuid;
  v_ask_account boolean;
  v_need_account boolean := false;
  v_accounts int;
  v_type public.category_type := case when p_type = 'income' then 'income' else 'expense' end;
  v_fallback text := case when p_type = 'income' then '其他收入' else '其他支出' end;
  v_category uuid;
  v_learned boolean := false;
  v_review boolean;
  v_label text;
  v_id uuid;
begin
  select user_id, default_asset_id, ask_account into v_user, v_asset, v_ask_account
  from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  if v_ask_account then
    v_asset := null;
    select count(*) into v_accounts from public.assets where user_id = v_user;
    if v_accounts = 1 then
      select id into v_asset from public.assets where user_id = v_user;
    elsif v_accounts > 1 then
      -- 截图上刚好只出现一个账户的名字 → 用它
      select count(*), (array_agg(id))[1] into v_accounts, v_asset
      from public.assets
      where user_id = v_user and length(trim(name)) >= 4
        and position(lower(trim(name)) in lower(coalesce(p_raw_text, ''))) > 0;
      if v_accounts <> 1 then
        v_asset := null;
        v_need_account := true;
      end if;
    end if;
  end if;

  -- 用户以前给这个商家 / 这个人选过分类（同一种：支出看支出的，收入看收入的）
  if public.merchant_key(p_merchant) <> '' then
    select r.category_id into v_category
    from public.merchant_rules r
    join public.categories c on c.id = r.category_id and c.type = v_type
    where r.user_id = v_user and r.merchant_key = public.merchant_key(p_merchant);
    v_learned := v_category is not null;
  end if;

  if v_category is null then
    select id into v_category from public.categories
    where type = v_type and label_zh = coalesce(p_category_label, v_fallback)
    limit 1;
  end if;
  if v_category is null then
    select id into v_category from public.categories
    where type = v_type and label_zh = v_fallback limit 1;
  end if;
  select label_zh into v_label from public.categories where id = v_category;

  v_review := coalesce(p_uncertain, false) and not v_learned;

  insert into public.transactions
    (user_id, category_id, type, amount, occurred_on, note, merchant, asset_id, source, raw_text,
     original_amount, original_currency, needs_review, needs_account)
  values
    (v_user, v_category, v_type, round(p_amount, 2), coalesce(p_occurred_on, current_date),
     null, nullif(trim(p_merchant), ''), v_asset, 'screenshot', left(p_raw_text, 4000),
     p_original_amount, nullif(upper(trim(p_original_currency)), ''), v_review, v_need_account)
  returning id into v_id;

  -- 支出：账户余额减少；收入：账户余额增加
  if v_asset is not null then
    update public.assets
      set balance = balance + (case when v_type = 'income' then 1 else -1 end) * round(p_amount, 2),
          updated_at = now()
      where id = v_asset;
  end if;

  update public.capture_tokens set last_used_at = now() where user_id = v_user;

  return json_build_object(
    'id', v_id, 'type', v_type, 'category', v_label, 'learned', v_learned, 'needs_review', v_review,
    'needs_account', v_need_account,
    'account', (select name from public.assets where id = v_asset),
    'accounts', case when v_need_account then
      (select json_agg(name order by created_at) from public.assets where user_id = v_user) end);
end;
$$;

revoke all on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean, text) from public;
grant execute on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean, text) to anon, authenticated;

-- 列表截图：每一笔可以带 type（没有就是支出）；查重也分开支出 / 收入
create or replace function public.capture_transactions_bulk(p_token text, p_items jsonb, p_raw_text text)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_item jsonb;
  v_amount numeric;
  v_date date;
  v_merchant text;
  v_type public.category_type;
  v_existing int;
  v_one json;
  v_results jsonb := '[]'::jsonb;
  v_added int := 0;
  v_skipped int := 0;
begin
  select user_id into v_user from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_amount := round((v_item->>'amount')::numeric, 2);
    v_date := coalesce((v_item->>'date')::date, current_date);
    v_merchant := v_item->>'merchant';
    v_type := case when v_item->>'type' = 'income' then 'income' else 'expense' end;
    if v_amount is null or v_amount <= 0 then
      continue;
    end if;

    select count(*) into v_existing from public.transactions
    where user_id = v_user and type = v_type and occurred_on = v_date and amount = v_amount
      and public.merchant_key(merchant) = public.merchant_key(v_merchant);

    if v_existing >= coalesce((v_item->>'nth')::int, 1) then
      v_skipped := v_skipped + 1;
      v_results := v_results || jsonb_build_object('skipped', true);
    else
      v_one := public.capture_transaction(
        p_token, v_amount, v_merchant, v_item->>'category', v_date, p_raw_text,
        null, null, coalesce((v_item->>'uncertain')::boolean, false), v_type::text);
      v_added := v_added + 1;
      v_results := v_results || (v_one::jsonb || jsonb_build_object('skipped', false));
    end if;
  end loop;

  return json_build_object('results', v_results, 'added', v_added, 'skipped', v_skipped);
end;
$$;

-- 快捷指令选单回来的分类：照那一笔是支出还是收入去找
create or replace function public.capture_set_category(
  p_token text,
  p_id uuid,
  p_category_label text,
  p_remember boolean default true
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_type public.category_type;
  v_category uuid;
  v_merchant text;
  v_key text;
begin
  select user_id into v_user from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  select type into v_type from public.transactions where id = p_id and user_id = v_user;
  if v_type is null then
    raise exception 'transaction not found' using errcode = '22023';
  end if;

  select id into v_category from public.categories
  where type = v_type and label_zh = p_category_label limit 1;
  if v_category is null then
    raise exception 'unknown category' using errcode = '22023';
  end if;

  update public.transactions
    set category_id = v_category, needs_review = false
    where id = p_id and user_id = v_user
    returning merchant into v_merchant;

  v_key := public.merchant_key(v_merchant);
  if coalesce(p_remember, true) and v_key <> '' then
    insert into public.merchant_rules (user_id, merchant_key, merchant_name, category_id)
    values (v_user, v_key, trim(v_merchant), v_category)
    on conflict (user_id, merchant_key)
    do update set category_id = excluded.category_id, merchant_name = excluded.merchant_name, updated_at = now();

    update public.transactions
      set category_id = v_category, needs_review = false
      where user_id = v_user and type = v_type and public.merchant_key(merchant) = v_key
        and (category_id <> v_category or needs_review);
  end if;

  return json_build_object('category', p_category_label, 'merchant', v_merchant, 'type', v_type);
end;
$$;
