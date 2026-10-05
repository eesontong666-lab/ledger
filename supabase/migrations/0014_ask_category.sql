-- 不确定分类的交易先标成“待分类”，让用户在快捷指令弹出的选单或 App 首页选。

alter table public.transactions
  add column if not exists needs_review boolean not null default false;
create index if not exists transactions_needs_review_idx on public.transactions (user_id) where needs_review;

-- 多了 p_uncertain：服务器认不出这个商家时传 true。用户以前教过这个商家就不用再问。
drop function if exists public.capture_transaction(text, numeric, text, text, date, text, numeric, text);

create or replace function public.capture_transaction(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_category_label text,
  p_occurred_on date,
  p_raw_text text,
  p_original_amount numeric default null,
  p_original_currency text default null,
  p_uncertain boolean default false
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_asset uuid;
  v_category uuid;
  v_learned boolean := false;
  v_review boolean;
  v_label text;
  v_id uuid;
begin
  select user_id, default_asset_id into v_user, v_asset
  from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  -- 用户以前改过这个商家的分类 → 直接用他选的
  if public.merchant_key(p_merchant) <> '' then
    select r.category_id into v_category
    from public.merchant_rules r
    join public.categories c on c.id = r.category_id and c.type = 'expense'
    where r.user_id = v_user and r.merchant_key = public.merchant_key(p_merchant);
    v_learned := v_category is not null;
  end if;

  if v_category is null then
    select id into v_category from public.categories
    where type = 'expense' and label_zh = coalesce(p_category_label, '其他支出')
    limit 1;
  end if;
  if v_category is null then
    select id into v_category from public.categories
    where type = 'expense' and label_zh = '其他支出' limit 1;
  end if;
  select label_zh into v_label from public.categories where id = v_category;

  v_review := coalesce(p_uncertain, false) and not v_learned;

  insert into public.transactions
    (user_id, category_id, type, amount, occurred_on, note, merchant, asset_id, source, raw_text,
     original_amount, original_currency, needs_review)
  values
    (v_user, v_category, 'expense', round(p_amount, 2), coalesce(p_occurred_on, current_date),
     null, nullif(trim(p_merchant), ''), v_asset, 'screenshot', left(p_raw_text, 4000),
     p_original_amount, nullif(upper(trim(p_original_currency)), ''), v_review)
  returning id into v_id;

  if v_asset is not null then
    update public.assets set balance = balance - round(p_amount, 2), updated_at = now()
    where id = v_asset;
  end if;

  update public.capture_tokens set last_used_at = now() where user_id = v_user;

  return json_build_object('id', v_id, 'category', v_label, 'learned', v_learned, 'needs_review', v_review);
end;
$$;

revoke all on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean) from public;
grant execute on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean) to anon, authenticated;

-- 快捷指令弹出选单后，把用户选的分类写回去（同样靠密钥识别用户）。
-- p_remember = true 时记住这个商家，以后不再问，同一商家的旧记录也一起改。
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
  v_category uuid;
  v_merchant text;
  v_key text;
begin
  select user_id into v_user from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  select id into v_category from public.categories
  where type = 'expense' and label_zh = p_category_label limit 1;
  if v_category is null then
    raise exception 'unknown category' using errcode = '22023';
  end if;

  update public.transactions
    set category_id = v_category, needs_review = false
    where id = p_id and user_id = v_user and type = 'expense'
    returning merchant into v_merchant;
  if not found then
    raise exception 'transaction not found' using errcode = '22023';
  end if;

  v_key := public.merchant_key(v_merchant);
  if coalesce(p_remember, true) and v_key <> '' then
    insert into public.merchant_rules (user_id, merchant_key, merchant_name, category_id)
    values (v_user, v_key, trim(v_merchant), v_category)
    on conflict (user_id, merchant_key)
    do update set category_id = excluded.category_id, merchant_name = excluded.merchant_name, updated_at = now();

    update public.transactions
      set category_id = v_category, needs_review = false
      where user_id = v_user and type = 'expense' and public.merchant_key(merchant) = v_key
        and (category_id <> v_category or needs_review);
  end if;

  return json_build_object('category', p_category_label, 'merchant', v_merchant);
end;
$$;

revoke all on function public.capture_set_category(text, uuid, text, boolean) from public;
grant execute on function public.capture_set_category(text, uuid, text, boolean) to anon, authenticated;

-- 在 App 里改分类并记住商家时，同一商家的“待分类”也一起清掉
create or replace function public.remember_merchant_category(p_merchant text, p_category_id uuid)
returns int
language plpgsql
security invoker set search_path = public
as $$
declare
  v_key text := public.merchant_key(p_merchant);
  v_type public.category_type;
  v_count int;
begin
  if v_key = '' or (select auth.uid()) is null then
    return 0;
  end if;
  select type into v_type from public.categories where id = p_category_id;
  if v_type is null then
    return 0;
  end if;

  insert into public.merchant_rules (user_id, merchant_key, merchant_name, category_id)
  values ((select auth.uid()), v_key, trim(p_merchant), p_category_id)
  on conflict (user_id, merchant_key)
  do update set category_id = excluded.category_id, merchant_name = excluded.merchant_name, updated_at = now();

  update public.transactions
    set category_id = p_category_id, needs_review = false
    where user_id = (select auth.uid())
      and type = v_type
      and (category_id <> p_category_id or needs_review)
      and public.merchant_key(merchant) = v_key;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
