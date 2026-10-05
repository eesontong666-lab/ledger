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

-- ---------- 索引 ----------
create index if not exists transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index if not exists transactions_user_category_idx on public.transactions (user_id, category_id);
create index if not exists transactions_category_id_idx on public.transactions (category_id);
create index if not exists transactions_asset_idx on public.transactions (asset_id);
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

-- 快捷指令没有登录 cookie，靠密钥识别用户。security definer 才能越过 RLS 写入该用户的交易。
create or replace function public.capture_transaction(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_category_label text,
  p_occurred_on date,
  p_raw_text text
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_asset uuid;
  v_category uuid;
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

  select id into v_category from public.categories
  where type = 'expense' and label_zh = coalesce(p_category_label, '其他支出')
  limit 1;
  if v_category is null then
    select id into v_category from public.categories
    where type = 'expense' and label_zh = '其他支出' limit 1;
  end if;

  insert into public.transactions
    (user_id, category_id, type, amount, occurred_on, note, merchant, asset_id, source, raw_text)
  values
    (v_user, v_category, 'expense', round(p_amount, 2), coalesce(p_occurred_on, current_date),
     null, nullif(trim(p_merchant), ''), v_asset, 'screenshot', left(p_raw_text, 4000))
  returning id into v_id;

  if v_asset is not null then
    update public.assets set balance = balance - round(p_amount, 2), updated_at = now()
    where id = v_asset;
  end if;

  update public.capture_tokens set last_used_at = now() where user_id = v_user;

  return json_build_object('id', v_id);
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
revoke all on function public.capture_transaction(text, numeric, text, text, date, text) from public;
grant execute on function public.capture_transaction(text, numeric, text, text, date, text) to anon, authenticated;

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
