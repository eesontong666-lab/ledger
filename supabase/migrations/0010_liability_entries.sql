-- 负债的变动记录：正数 = 多欠了，负数 = 还款。让负债也能像银行账户一样点进去看进出。
create table if not exists public.liability_entries (
  id uuid primary key default gen_random_uuid(),
  liability_id uuid not null references public.liabilities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2) not null,
  note text,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists liability_entries_liability_idx on public.liability_entries (liability_id, occurred_on desc);
create index if not exists liability_entries_user_idx on public.liability_entries (user_id);
alter table public.liability_entries enable row level security;
create policy "liability_entries_all_own" on public.liability_entries
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
