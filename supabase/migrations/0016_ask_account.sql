-- 截图记账时问“用哪个账户付的”。

-- ask_account = true：每次都问（只有一个账户、或截图里认得出账户名时不用问）
-- ask_account = false：照 default_asset_id（可以是空 = 不记到任何账户）
alter table public.capture_tokens
  add column if not exists ask_account boolean not null default true;
-- 升级时：原本已经选好固定账户的人，保持原样，不要突然开始问
update public.capture_tokens set ask_account = false where default_asset_id is not null;
alter table public.transactions
  add column if not exists needs_account boolean not null default false;
create index if not exists transactions_needs_account_idx on public.transactions (user_id) where needs_account;

-- 把一笔交易挂到某个账户上（或换账户），同时把余额调对。内部用，不对外开放。
create or replace function public._move_transaction_account(p_user uuid, p_tx uuid, p_asset uuid)
returns numeric
language plpgsql
security definer set search_path = public
as $$
declare
  t public.transactions%rowtype;
  v_delta numeric;
  v_balance numeric;
begin
  select * into t from public.transactions where id = p_tx and user_id = p_user for update;
  if not found then
    return null;
  end if;
  if p_asset is not null and not exists (select 1 from public.assets where id = p_asset and user_id = p_user) then
    return null;
  end if;

  -- 支出让余额变少，收入让余额变多
  v_delta := case when t.type = 'income' then t.amount else -t.amount end;
  if t.asset_id is not distinct from p_asset then
    update public.transactions set needs_account = false where id = p_tx;
  else
    if t.asset_id is not null then
      update public.assets set balance = balance - v_delta, updated_at = now() where id = t.asset_id;
    end if;
    if p_asset is not null then
      update public.assets set balance = balance + v_delta, updated_at = now() where id = p_asset;
    end if;
    update public.transactions set asset_id = p_asset, needs_account = false where id = p_tx;
  end if;

  select balance into v_balance from public.assets where id = p_asset;
  return v_balance;
end;
$$;
revoke all on function public._move_transaction_account(uuid, uuid, uuid) from public, anon, authenticated;

-- App 里改某笔交易的账户
create or replace function public.set_transaction_account(p_id uuid, p_asset_id uuid)
returns numeric
language sql
security definer set search_path = public
as $$
  select public._move_transaction_account((select auth.uid()), p_id, p_asset_id);
$$;
revoke all on function public.set_transaction_account(uuid, uuid) from public, anon;
grant execute on function public.set_transaction_account(uuid, uuid) to authenticated;

-- 快捷指令弹出选单后，把用户选的账户写回去。p_ids 可以是一个 id，或用逗号隔开的好几个（列表截图）。
create or replace function public.capture_set_account(p_token text, p_ids text, p_account_name text)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_asset uuid;
  v_name text;
  v_id text;
  v_balance numeric;
  v_count int := 0;
begin
  select user_id into v_user from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  select id, name into v_asset, v_name from public.assets
  where user_id = v_user and lower(trim(name)) = lower(trim(p_account_name))
  order by created_at limit 1;
  if v_asset is null then
    raise exception 'unknown account' using errcode = '22023';
  end if;

  foreach v_id in array string_to_array(coalesce(p_ids, ''), ',') loop
    if trim(v_id) ~ '^[0-9a-fA-F-]{36}$' then
      v_balance := public._move_transaction_account(v_user, trim(v_id)::uuid, v_asset);
      if v_balance is not null then
        v_count := v_count + 1;
      end if;
    end if;
  end loop;

  select balance into v_balance from public.assets where id = v_asset;
  return json_build_object('account', v_name, 'balance', v_balance, 'count', v_count);
end;
$$;
revoke all on function public.capture_set_account(text, text, text) from public;
grant execute on function public.capture_set_account(text, text, text) to anon, authenticated;

-- capture_transaction：决定这笔记到哪个账户
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
  v_ask_account boolean;
  v_need_account boolean := false;
  v_accounts int;
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
      -- 只有一个账户，不用问
      select id into v_asset from public.assets where user_id = v_user;
    elsif v_accounts > 1 then
      -- 截图上刚好只出现一个账户的名字（例如账户就叫 “Boost”、“Maybank”）→ 用它
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
     original_amount, original_currency, needs_review, needs_account)
  values
    (v_user, v_category, 'expense', round(p_amount, 2), coalesce(p_occurred_on, current_date),
     null, nullif(trim(p_merchant), ''), v_asset, 'screenshot', left(p_raw_text, 4000),
     p_original_amount, nullif(upper(trim(p_original_currency)), ''), v_review, v_need_account)
  returning id into v_id;

  if v_asset is not null then
    update public.assets set balance = balance - round(p_amount, 2), updated_at = now()
    where id = v_asset;
  end if;

  update public.capture_tokens set last_used_at = now() where user_id = v_user;

  return json_build_object(
    'id', v_id, 'category', v_label, 'learned', v_learned, 'needs_review', v_review,
    'needs_account', v_need_account,
    'account', (select name from public.assets where id = v_asset),
    'accounts', case when v_need_account then
      (select json_agg(name order by created_at) from public.assets where user_id = v_user) end);
end;
$$;
