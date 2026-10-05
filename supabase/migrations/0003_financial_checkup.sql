-- Financial checkup module: a single evolving "current snapshot" profile per user
-- (not a transaction log) used to power the affordability / FI-number / card-type /
-- property-readiness calculators. Inputs are user-editable; expense/savings can be
-- overridden manually or left null to fall back to computed values from
-- transactions/assets in the app layer.

create type public.spending_style as enum (
  'daily_life',
  'online_shopping',
  'travel',
  'dining',
  'mixed'
);

create table public.financial_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  monthly_income numeric(14,2) not null default 0,
  monthly_expense_override numeric(14,2),
  existing_monthly_debt numeric(14,2) not null default 0,
  target_car_price numeric(14,2),
  spending_style public.spending_style,
  updated_at timestamptz not null default now()
);

alter table public.financial_profile enable row level security;

create policy "financial_profile_all_own" on public.financial_profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
