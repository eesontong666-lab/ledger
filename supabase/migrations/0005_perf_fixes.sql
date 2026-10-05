-- Wrap auth.uid() as (select auth.uid()) so Postgres evaluates it once per
-- query instead of once per row, and add indexes for unindexed foreign keys.

create index if not exists assets_user_id_idx on public.assets (user_id);
create index if not exists liabilities_user_id_idx on public.liabilities (user_id);
create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id);
create index if not exists goal_contributions_goal_id_idx on public.goal_contributions (goal_id);
create index if not exists goal_contributions_user_id_idx on public.goal_contributions (user_id);
create index if not exists budgets_category_id_idx on public.budgets (category_id);
create index if not exists transactions_category_id_idx on public.transactions (category_id);

drop policy "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);
drop policy "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id);

drop policy "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using ((select auth.uid()) = user_id);
drop policy "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check ((select auth.uid()) = user_id);
drop policy "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using ((select auth.uid()) = user_id);

drop policy "budgets_select_own" on public.budgets;
create policy "budgets_select_own" on public.budgets
  for select using ((select auth.uid()) = user_id);
drop policy "budgets_insert_own" on public.budgets;
create policy "budgets_insert_own" on public.budgets
  for insert with check ((select auth.uid()) = user_id);
drop policy "budgets_update_own" on public.budgets;
create policy "budgets_update_own" on public.budgets
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "budgets_delete_own" on public.budgets;
create policy "budgets_delete_own" on public.budgets
  for delete using ((select auth.uid()) = user_id);

drop policy "assets_all_own" on public.assets;
create policy "assets_all_own" on public.assets
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "liabilities_all_own" on public.liabilities;
create policy "liabilities_all_own" on public.liabilities
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "goals_all_own" on public.savings_goals;
create policy "goals_all_own" on public.savings_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "goal_contributions_all_own" on public.goal_contributions;
create policy "goal_contributions_all_own" on public.goal_contributions
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy "financial_profile_all_own" on public.financial_profile;
create policy "financial_profile_all_own" on public.financial_profile
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
