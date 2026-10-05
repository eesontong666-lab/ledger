-- ========== profiles ==========
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', new.email));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== categories (shared, seeded, read-only to users) ==========
create type public.category_type as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  type public.category_type not null,
  label_zh text not null,
  icon text,
  sort_order int not null default 0
);

alter table public.categories enable row level security;

create policy "categories_select_all" on public.categories
  for select using (true);

-- ========== transactions ==========
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  type public.category_type not null,
  amount numeric(14,2) not null check (amount > 0),
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_user_category_idx on public.transactions (user_id, category_id);

alter table public.transactions enable row level security;

create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ========== budgets ==========
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  month date not null,
  limit_amount numeric(14,2) not null check (limit_amount >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

alter table public.budgets enable row level security;

create policy "budgets_select_own" on public.budgets
  for select using (auth.uid() = user_id);
create policy "budgets_insert_own" on public.budgets
  for insert with check (auth.uid() = user_id);
create policy "budgets_update_own" on public.budgets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_delete_own" on public.budgets
  for delete using (auth.uid() = user_id);

-- ========== assets & liabilities (point-in-time balance snapshots) ==========
create type public.asset_category as enum ('cash', 'savings', 'investment', 'property', 'other_asset');
create type public.liability_category as enum ('loan', 'credit_card', 'mortgage', 'other_liability');

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.asset_category not null,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category public.liability_category not null,
  balance numeric(14,2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;
alter table public.liabilities enable row level security;

create policy "assets_all_own" on public.assets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "liabilities_all_own" on public.liabilities
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========== savings goals ==========
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date,
  current_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  archived boolean not null default false
);

create table public.goal_contributions (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.savings_goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.savings_goals enable row level security;
alter table public.goal_contributions enable row level security;

create policy "goals_all_own" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goal_contributions_all_own" on public.goal_contributions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create function public.apply_goal_contribution()
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

create trigger goal_contributions_sync
  after insert or update or delete on public.goal_contributions
  for each row execute function public.apply_goal_contribution();
