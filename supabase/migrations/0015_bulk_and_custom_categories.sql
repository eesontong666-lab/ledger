-- 1) 分类可以自己加：账本主人可以新增、修改、删除分类
drop policy if exists "categories_insert_auth" on public.categories;
create policy "categories_insert_auth" on public.categories for insert to authenticated with check (true);
drop policy if exists "categories_update_auth" on public.categories;
create policy "categories_update_auth" on public.categories for update to authenticated using (true) with check (true);
drop policy if exists "categories_delete_auth" on public.categories;
create policy "categories_delete_auth" on public.categories for delete to authenticated using (true);
grant insert, update, delete on public.categories to authenticated;
create unique index if not exists categories_type_label_key on public.categories (type, label_zh);

-- 2) 一张截图里有好几笔交易（银行的活动列表）：一次全部记下
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

revoke all on function public.capture_transactions_bulk(text, jsonb, text) from public;
grant execute on function public.capture_transactions_bulk(text, jsonb, text) to anon, authenticated;
