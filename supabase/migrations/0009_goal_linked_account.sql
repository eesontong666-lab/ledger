-- 储蓄目标可以绑定一个银行账户：绑定后进度直接看该账户的余额（实时），不再手动存入
alter table public.savings_goals
  add column if not exists asset_id uuid references public.assets(id) on delete set null;
create index if not exists savings_goals_asset_idx on public.savings_goals (asset_id);
