-- 外币消费：记账金额一律是马币，另外存下截图上原本的外币金额和货币代码
alter table public.transactions
  add column if not exists original_amount numeric(20,8),
  add column if not exists original_currency text;
-- capture_transaction 多了两个可选参数（p_original_amount, p_original_currency），完整定义见 ../setup.sql
