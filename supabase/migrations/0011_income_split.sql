-- 收入按比例分配：每个账户占多少 %（全部加起来应为 100，0 = 不参与）
alter table public.assets
  add column if not exists income_split_percent numeric(5,2) not null default 0
  check (income_split_percent >= 0 and income_split_percent <= 100);
