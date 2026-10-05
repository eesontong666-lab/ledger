-- ========== 个人版：只用一个 6 位密码进入 ==========
-- 不再让用户用邮箱登录。密码在服务器验证（bcrypt），连错 5 次锁 15 分钟。
-- 验证通过后由 Edge Function `passcode-login` 以 owner 身份签发会话，RLS 照旧生效。

create table if not exists public.app_passcode (
  id boolean primary key default true check (id), -- 只允许一行
  owner_id uuid not null references auth.users(id) on delete cascade,
  passcode_hash text, -- null = 还没设置，第一次打开时设置
  failed_attempts int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- 不建任何 policy：只有下面的 security definer 函数和 service role 能碰这张表
alter table public.app_passcode enable row level security;

-- （账本主人那一行现在由 App 在第一次设置密码时自动建立，见 lib/actions/passcode.ts）

-- 登录页用：密码设了没有
create or replace function public.app_passcode_state()
returns text
language sql
security definer set search_path = public
stable
as $$
  select case when passcode_hash is null then 'unset' else 'set' end from public.app_passcode;
$$;

-- 只给 Edge Function（service role）调用
create or replace function public.app_passcode_login(p_passcode text, p_setup boolean)
returns json
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  r public.app_passcode%rowtype;
begin
  select * into r from public.app_passcode for update;
  if not found then
    return json_build_object('status', 'error');
  end if;

  if p_passcode is null or p_passcode !~ '^[0-9]{6}$' then
    return json_build_object('status', 'invalid');
  end if;

  if r.locked_until is not null and r.locked_until > now() then
    return json_build_object('status', 'locked',
      'seconds', ceil(extract(epoch from r.locked_until - now()))::int);
  end if;

  if r.passcode_hash is null then
    if not coalesce(p_setup, false) then
      return json_build_object('status', 'unset');
    end if;
    update public.app_passcode
      set passcode_hash = crypt(p_passcode, gen_salt('bf', 10)), failed_attempts = 0,
          locked_until = null, updated_at = now()
      where id;
    return json_build_object('status', 'ok', 'owner_id', r.owner_id);
  end if;

  if crypt(p_passcode, r.passcode_hash) = r.passcode_hash then
    update public.app_passcode set failed_attempts = 0, locked_until = null where id;
    return json_build_object('status', 'ok', 'owner_id', r.owner_id);
  end if;

  if r.failed_attempts + 1 >= 5 then
    update public.app_passcode set failed_attempts = 0, locked_until = now() + interval '15 minutes' where id;
    return json_build_object('status', 'locked', 'seconds', 900);
  end if;

  update public.app_passcode set failed_attempts = r.failed_attempts + 1 where id;
  return json_build_object('status', 'wrong', 'remaining', 4 - r.failed_attempts);
end;
$$;

-- 已进入 App 的 owner 修改密码
create or replace function public.change_app_passcode(p_new text)
returns void
language plpgsql
security definer set search_path = public, extensions
as $$
begin
  if p_new is null or p_new !~ '^[0-9]{6}$' then
    raise exception 'invalid passcode' using errcode = '22023';
  end if;
  update public.app_passcode
    set passcode_hash = crypt(p_new, gen_salt('bf', 10)), failed_attempts = 0,
        locked_until = null, updated_at = now()
    where owner_id = (select auth.uid());
  if not found then
    raise exception 'not owner' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.app_passcode_login(text, boolean) from public, anon, authenticated;
grant execute on function public.app_passcode_login(text, boolean) to service_role;

revoke all on function public.change_app_passcode(text) from public, anon;
grant execute on function public.change_app_passcode(text) to authenticated;

revoke all on function public.app_passcode_state() from public;
grant execute on function public.app_passcode_state() to anon, authenticated;
