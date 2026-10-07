-- 一次建好整个数据库。可以重复执行（每次部署都会跑一遍），已经有的东西不会被动到。
-- 由 scripts/setup-db.mjs 在 Vercel 构建时执行；也可以整段贴进 Supabase 的 SQL Editor 手动跑。

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------- 枚举 ----------
do $$ begin
  create type public.category_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.asset_category as enum ('cash', 'savings', 'investment', 'property', 'other_asset');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.liability_category as enum ('loan', 'credit_card', 'mortgage', 'other_liability');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.spending_style as enum ('daily_life', 'online_shopping', 'travel', 'dining', 'mixed');
exception when duplicate_object then null; end $$;

-- ---------- 表 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  type public.category_type not null,
  label_zh text not null,
  icon text,
  sort_order int not null default 0
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.asset_category not null,
  balance numeric(14,2) not null default 0,
  income_split_percent numeric(5,2) not null default 0
    check (income_split_percent >= 0 and income_split_percent <= 100),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.liability_category not null,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.liability_entries (
  id uuid primary key default gen_random_uuid(),
  liability_id uuid not null references public.liabilities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  type public.category_type not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note text,
  merchant text,
  asset_id uuid references public.assets(id) on delete set null,
  source text not null default 'manual',
  raw_text text,
  original_amount numeric(20,8),
  original_currency text,
  needs_review boolean not null default false,
  needs_account boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  month date not null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date,
  current_amount numeric(14,2) not null default 0,
  asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table if not exists public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric(14,2) not null default 0,
  monthly_expense_override numeric(14,2),
  existing_monthly_debt numeric(14,2) not null default 0,
  target_car_price numeric(14,2),
  spending_style public.spending_style,
  updated_at timestamptz not null default now()
);

-- 截图记账的密钥：只存 sha256(token)
create table if not exists public.capture_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  default_asset_id uuid references public.assets(id) on delete set null,
  ask_account boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

-- 进入 App 的 6 位密码（整张表只有一行；没有任何 policy，只有下面的函数和 service role 能碰）
create table if not exists public.app_passcode (
  id boolean primary key default true check (id),
  owner_id uuid not null references auth.users(id) on delete cascade,
  passcode_hash text,
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- 旧版本升级时补上后来才加的栏位（全新安装时这些已经在上面建好，不会重复） ----------
alter table public.transactions
  add column if not exists original_amount numeric(20,8),
  add column if not exists original_currency text,
  add column if not exists needs_review boolean not null default false,
  add column if not exists needs_account boolean not null default false;
-- ask_account 是后来才加的。升级时，原本已经选好固定账户的人保持原样，不要突然开始问。
do $$ begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'capture_tokens' and column_name = 'ask_account') then
    alter table public.capture_tokens add column ask_account boolean not null default true;
    update public.capture_tokens set ask_account = false where default_asset_id is not null;
  end if;
end $$;

-- ---------- 索引 ----------
create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_user_category_idx on public.transactions (user_id, category_id);
create index if not exists transactions_category_id_idx on public.transactions (category_id);
create index if not exists transactions_asset_idx on public.transactions (asset_id);
create unique index if not exists categories_type_label_key on public.categories (type, label_zh);
create index if not exists transactions_needs_account_idx on public.transactions (user_id) where needs_account;
create index if not exists transactions_needs_review_idx on public.transactions (user_id) where needs_review;
create index if not exists assets_user_id_idx on public.assets (user_id);
create index if not exists liabilities_user_id_idx on public.liabilities (user_id);
create index if not exists liability_entries_liability_idx on public.liability_entries (liability_id, occurred_on desc);
create index if not exists liability_entries_user_idx on public.liability_entries (user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id);
create index if not exists savings_goals_asset_idx on public.savings_goals (asset_id);
create index if not exists goal_contributions_goal_id_idx on public.goal_contributions (goal_id);
create index if not exists goal_contributions_user_id_idx on public.goal_contributions (user_id);
create index if not exists budgets_category_id_idx on public.budgets (category_id);

-- ---------- 行级权限：每个人只能看到、改动自己的资料 ----------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.assets enable row level security;
alter table public.liabilities enable row level security;
alter table public.liability_entries enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;
alter table public.financial_profile enable row level security;
alter table public.capture_tokens enable row level security;
alter table public.app_passcode enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using ((select auth.uid()) = id);

drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories for select using (true);

-- 分类是整个账本共用的：谁都能读，登录的主人可以自己新增 / 修改 / 删除
drop policy if exists "categories_insert_auth" on public.categories;
create policy "categories_insert_auth" on public.categories for insert to authenticated with check (true);
drop policy if exists "categories_update_auth" on public.categories;
create policy "categories_update_auth" on public.categories for update to authenticated using (true) with check (true);
drop policy if exists "categories_delete_auth" on public.categories;
create policy "categories_delete_auth" on public.categories for delete to authenticated using (true);

drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions for select using ((select auth.uid()) = user_id);
drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions for insert with check ((select auth.uid()) = user_id);
drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions for delete using ((select auth.uid()) = user_id);

drop policy if exists "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets for select using ((select auth.uid()) = user_id);
drop policy if exists "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets for insert with check ((select auth.uid()) = user_id);
drop policy if exists "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets for delete using ((select auth.uid()) = user_id);

drop policy if exists "assets_all_own" on public.assets;
create policy "assets_all_own" on public.assets
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "liabilities_all_own" on public.liabilities;
create policy "liabilities_all_own" on public.liabilities
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "liability_entries_all_own" on public.liability_entries;
create policy "liability_entries_all_own" on public.liability_entries
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "goals_all_own" on public.savings_goals;
create policy "goals_all_own" on public.savings_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "goal_contributions_all_own" on public.goal_contributions;
create policy "goal_contributions_all_own" on public.goal_contributions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "financial_profile_all_own" on public.financial_profile;
create policy "financial_profile_all_own" on public.financial_profile
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "capture_tokens_all_own" on public.capture_tokens;
create policy "capture_tokens_all_own" on public.capture_tokens
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ---------- 函数和触发器 ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.apply_goal_contribution()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.savings_goals set current_amount = current_amount + new.amount where id = new.goal_id;
  elsif TG_OP = 'DELETE' then
    update public.savings_goals set current_amount = current_amount - old.amount where id = old.goal_id;
  elsif TG_OP = 'UPDATE' then
    update public.savings_goals set current_amount = current_amount - old.amount + new.amount where id = new.goal_id;
  end if;
  return null;
end;
$$;

drop trigger if exists goal_contributions_sync on public.goal_contributions;
create trigger goal_contributions_sync
  after insert or update or delete on public.goal_contributions
  for each row execute function public.apply_goal_contribution();

-- ---------- 记住用户改过的商家分类 ----------
-- 商家名字的比对键：只留字母数字、全部大写（"McDonald's SS15" → "MCDONALDSSS15"）
create or replace function public.merchant_key(p_merchant text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(coalesce(p_merchant, ''), '[^[:alnum:]]+', '', 'g'));
$$;

create table if not exists public.merchant_rules (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant_key text not null,
  merchant_name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
create index if not exists merchant_rules_category_idx on public.merchant_rules (category_id);
alter table public.merchant_rules enable row level security;
drop policy if exists "merchant_rules_all_own" on public.merchant_rules;
create policy "merchant_rules_all_own" on public.merchant_rules
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 用户在 App 里改了某笔交易的分类时调用：记住这个商家，同一商家的其他记录（包括“待分类”的）一起改。返回改了几笔。
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
revoke all on function public.remember_merchant_category(text, uuid) from public, anon;
grant execute on function public.remember_merchant_category(text, uuid) to authenticated;

-- 快捷指令没有登录 cookie，靠密钥识别用户。security definer 才能越过 RLS 写入该用户的交易。
-- 旧版本（参数比较少）要先删掉，否则会和新版并存、调用时分不清
drop function if exists public.capture_transaction(text, numeric, text, text, date, text);
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

-- 交易的每一栏都可以手动改：金额、商家、日期、备注。
-- 金额改了、而且这笔挂在某个账户上时，账户余额跟着补差额。
create or replace function public.update_transaction_details(
  p_id uuid,
  p_amount numeric,
  p_merchant text,
  p_occurred_on date,
  p_note text
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  t public.transactions%rowtype;
  v_amount numeric := round(p_amount, 2);
begin
  select * into t from public.transactions
  where id = p_id and user_id = (select auth.uid()) for update;
  if not found then
    raise exception 'transaction not found' using errcode = '22023';
  end if;
  if v_amount is null or v_amount <= 0 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  if t.asset_id is not null and v_amount <> t.amount then
    -- 支出变多 → 余额再少一点；收入变多 → 余额再多一点
    update public.assets
      set balance = balance + (v_amount - t.amount) * (case when t.type = 'income' then 1 else -1 end),
          updated_at = now()
      where id = t.asset_id;
  end if;

  update public.transactions
    set amount = v_amount,
        merchant = nullif(trim(coalesce(p_merchant, '')), ''),
        occurred_on = coalesce(p_occurred_on, t.occurred_on),
        note = nullif(trim(coalesce(p_note, '')), '')
    where id = p_id;
end;
$$;

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

-- 一张截图里有好几笔交易（银行的活动列表）：一次全部记下
-- p_items: [{ amount, merchant, category, date, uncertain, nth }]
--   nth = 这一笔是这张截图里“同一天、同金额、同商家”的第几笔（从 1 开始）。
--   账本里已经有 nth 笔或更多一样的，就当作记过了，跳过。这样之前敲过两下的不会重复，
--   同一天真的买了两次一样的也不会被漏掉。
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
    if v_amount is null or v_amount <= 0 then
      continue;
    end if;

    select count(*) into v_existing from public.transactions
    where user_id = v_user and type = 'expense' and occurred_on = v_date and amount = v_amount
      and public.merchant_key(merchant) = public.merchant_key(v_merchant);

    if v_existing >= coalesce((v_item->>'nth')::int, 1) then
      v_skipped := v_skipped + 1;
      v_results := v_results || jsonb_build_object('skipped', true);
    else
      v_one := public.capture_transaction(
        p_token, v_amount, v_merchant, v_item->>'category', v_date, p_raw_text,
        null, null, coalesce((v_item->>'uncertain')::boolean, false));
      v_added := v_added + 1;
      v_results := v_results || (v_one::jsonb || jsonb_build_object('skipped', false));
    end if;
  end loop;

  return json_build_object('results', v_results, 'added', v_added, 'skipped', v_skipped);
end;
$$;

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

-- 登录页用：密码设了没有（还没有主人时返回 null）
create or replace function public.app_passcode_state()
returns text
language sql
security definer set search_path = public
stable
as $$
  select case when passcode_hash is null then 'unset' else 'set' end from public.app_passcode;
$$;

-- 验证 / 第一次设置密码。只给服务器（service role）调用。连错 5 次锁 15 分钟。
-- 注意：Supabase 的 API 角色不允许没有 WHERE 的 UPDATE，所以都写 where id。
create or replace function public.app_passcode_login(p_passcode text, p_setup boolean)
returns json
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  r public.app_passcode%rowtype;
begin
  select * into r from public.app_passcode for update;
  if not found then
    return json_build_object('status', 'noowner');
  end if;

  if p_passcode is null or p_passcode !~ '^[0-9]{6}$' then
    return json_build_object('status', 'invalid');
  end if;

  if r.locked_until is not null and r.locked_until > now() then
    return json_build_object('status', 'locked',
      'seconds', ceil(extract(epoch from r.locked_until - now()))::int);
  end if;

  if r.passcode_hash is null then
    if not coalesce(p_setup, false) then
      return json_build_object('status', 'unset');
    end if;
    update public.app_passcode
      set passcode_hash = crypt(p_passcode, gen_salt('bf', 10)), failed_attempts = 0,
          locked_until = null, updated_at = now()
      where id;
    return json_build_object('status', 'ok', 'owner_id', r.owner_id);
  end if;

  if crypt(p_passcode, r.passcode_hash) = r.passcode_hash then
    update public.app_passcode set failed_attempts = 0, locked_until = null where id;
    return json_build_object('status', 'ok', 'owner_id', r.owner_id);
  end if;

  if r.failed_attempts + 1 >= 5 then
    update public.app_passcode set failed_attempts = 0, locked_until = now() + interval '15 minutes' where id;
    return json_build_object('status', 'locked', 'seconds', 900);
  end if;

  update public.app_passcode set failed_attempts = r.failed_attempts + 1 where id;
  return json_build_object('status', 'wrong', 'remaining', 4 - r.failed_attempts);
end;
$$;

-- 已进入 App 的主人修改密码
create or replace function public.change_app_passcode(p_new text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  if p_new is null or p_new !~ '^[0-9]{6}$' then
    raise exception 'invalid passcode' using errcode = '22023';
  end if;
  update public.app_passcode
    set passcode_hash = crypt(p_new, gen_salt('bf', 10)), failed_attempts = 0,
        locked_until = null, updated_at = now()
    where owner_id = (select auth.uid());
  if not found then
    raise exception 'not owner' using errcode = '42501';
  end if;
end;
$$;

-- ---------- 函数权限 ----------
revoke all on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean) from public;
grant execute on function public.capture_transaction(text, numeric, text, text, date, text, numeric, text, boolean) to anon, authenticated;

revoke all on function public.capture_transactions_bulk(text, jsonb, text) from public;
grant execute on function public.capture_transactions_bulk(text, jsonb, text) to anon, authenticated;

revoke all on function public._move_transaction_account(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_transaction_account(uuid, uuid) from public, anon;
grant execute on function public.set_transaction_account(uuid, uuid) to authenticated;
revoke all on function public.capture_set_account(text, text, text) from public;
grant execute on function public.capture_set_account(text, text, text) to anon, authenticated;

revoke all on function public.update_transaction_details(uuid, numeric, text, date, text) from public, anon;
grant execute on function public.update_transaction_details(uuid, numeric, text, date, text) to authenticated;

revoke all on function public.capture_set_category(text, uuid, text, boolean) from public;
grant execute on function public.capture_set_category(text, uuid, text, boolean) to anon, authenticated;

revoke all on function public.app_passcode_login(text, boolean) from public, anon, authenticated;
grant execute on function public.app_passcode_login(text, boolean) to service_role;

revoke all on function public.change_app_passcode(text) from public, anon;
grant execute on function public.change_app_passcode(text) to authenticated;

revoke all on function public.app_passcode_state() from public;
grant execute on function public.app_passcode_state() to anon, authenticated;

-- ---------- 表权限（用连接串直接建表时，Supabase 不一定会自动授权给 API 角色） ----------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.categories to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- ---------- 预设分类（只在全新的数据库里放一次） ----------
insert into public.categories (type, label_zh, sort_order)
select v.type::public.category_type, v.label_zh, v.sort_order
from (values
  ('income', '工资', 1),
  ('income', '奖金', 2),
  ('income', '投资收益', 3),
  ('income', '其他收入', 4),
  ('expense', '衣', 10),
  ('expense', '食', 11),
  ('expense', '住', 12),
  ('expense', '行', 13),
  ('expense', '其他支出', 19)
) as v(type, label_zh, sort_order)
where not exists (select 1 from public.categories);
