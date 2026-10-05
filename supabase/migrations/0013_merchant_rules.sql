-- 记住用户改过的商家分类：下次同一个商家自动用这个分类（优先于银行分类和内置品牌名单）

-- 商家名字的比对键：只留字母数字、全部大写（"McDonald's SS15" → "MCDONALDSSS15"）
create or replace function public.merchant_key(p_merchant text)
returns text
language sql
immutable
set search_path = public
as $$
  select upper(regexp_replace(coalesce(p_merchant, ''), '[^[:alnum:]]+', '', 'g'));
$$;

create table if not exists public.merchant_rules (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  merchant_key text not null,
  merchant_name text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant_key)
);
create index if not exists merchant_rules_category_idx on public.merchant_rules (category_id);
alter table public.merchant_rules enable row level security;
drop policy if exists "merchant_rules_all_own" on public.merchant_rules;
create policy "merchant_rules_all_own" on public.merchant_rules
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 用户在某笔交易上改了分类时调用：记住这个商家，并把同一商家的其他记录一起改过来。返回一起改了几笔。
create or replace function public.remember_merchant_category(p_merchant text, p_category_id uuid)
returns int
language plpgsql
security invoker set search_path = public
as $$
declare
  v_key text := public.merchant_key(p_merchant);
  v_type public.category_type;
  v_count int;
begin
  if v_key = '' or (select auth.uid()) is null then
    return 0;
  end if;
  select type into v_type from public.categories where id = p_category_id;
  if v_type is null then
    return 0;
  end if;

  insert into public.merchant_rules (user_id, merchant_key, merchant_name, category_id)
  values ((select auth.uid()), v_key, trim(p_merchant), p_category_id)
  on conflict (user_id, merchant_key)
  do update set category_id = excluded.category_id, merchant_name = excluded.merchant_name, updated_at = now();

  update public.transactions
    set category_id = p_category_id
    where user_id = (select auth.uid())
      and type = v_type
      and category_id <> p_category_id
      and public.merchant_key(merchant) = v_key;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
revoke all on function public.remember_merchant_category(text, uuid) from public, anon;
grant execute on function public.remember_merchant_category(text, uuid) to authenticated;
-- capture_transaction 也改了：先查 merchant_rules，再用传进来的分类。完整定义见 ../setup.sql
