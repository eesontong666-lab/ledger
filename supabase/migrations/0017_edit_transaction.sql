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
revoke all on function public.update_transaction_details(uuid, numeric, text, date, text) from public, anon;
grant execute on function public.update_transaction_details(uuid, numeric, text, date, text) to authenticated;
