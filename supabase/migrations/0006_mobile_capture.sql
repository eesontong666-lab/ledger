-- ========== 手机版：交易补充字段 ==========
alter table public.transactions
  add column if not exists merchant text,
  add column if not exists asset_id uuid references public.assets(id) on delete set null,
  add column if not exists source text not null default 'manual',
  add column if not exists raw_text text;

create index if not exists transactions_asset_idx on public.transactions (asset_id);

-- ========== 快捷指令密钥（截图自动记账用）==========
-- 只存 sha256(token)，明文只在生成时显示一次。
create table if not exists public.capture_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text not null unique,
  default_asset_id uuid references public.assets(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.capture_tokens enable row level security;

create policy "capture_tokens_all_own" on public.capture_tokens
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 快捷指令没有登录 cookie，靠密钥识别用户。security definer 才能越过 RLS 写入该用户的交易。
create or replace function public.capture_transaction(
  p_token text,
  p_amount numeric,
  p_merchant text,
  p_category_label text,
  p_occurred_on date,
  p_raw_text text
)
returns json
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid;
  v_asset uuid;
  v_category uuid;
  v_id uuid;
begin
  select user_id, default_asset_id into v_user, v_asset
  from public.capture_tokens
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  if v_user is null then
    raise exception 'invalid token' using errcode = '28000';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid amount' using errcode = '22023';
  end if;

  select id into v_category from public.categories
  where type = 'expense' and label_zh = coalesce(p_category_label, '其他支出')
  limit 1;
  if v_category is null then
    select id into v_category from public.categories
    where type = 'expense' and label_zh = '其他支出' limit 1;
  end if;

  insert into public.transactions
    (user_id, category_id, type, amount, occurred_on, note, merchant, asset_id, source, raw_text)
  values
    (v_user, v_category, 'expense', round(p_amount, 2), coalesce(p_occurred_on, current_date),
     null, nullif(trim(p_merchant), ''), v_asset, 'screenshot', left(p_raw_text, 4000))
  returning id into v_id;

  if v_asset is not null then
    update public.assets set balance = balance - round(p_amount, 2), updated_at = now()
    where id = v_asset;
  end if;

  update public.capture_tokens set last_used_at = now() where user_id = v_user;

  return json_build_object('id', v_id);
end;
$$;

revoke all on function public.capture_transaction(text, numeric, text, text, date, text) from public;
grant execute on function public.capture_transaction(text, numeric, text, text, date, text) to anon, authenticated;
