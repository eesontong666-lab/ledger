"use server";

import { randomBytes } from "node:crypto";
import { createClient as createAdminClient, type EmailOtpType, type SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, serviceRoleKey } from "@/lib/supabase/env";

export type PasscodeResult =
  | { status: "ok" }
  | { status: "wrong"; remaining: number }
  | { status: "locked"; seconds: number }
  | { status: "unset" }
  | { status: "invalid" }
  | { status: "error" };

type Verified = { status: string; remaining?: number; seconds?: number; token_hash?: string; type?: string };

// app_passcode / app_passcode_login 只给 service role 用，故意不放进给浏览器用的 Database 类型里
type Admin = SupabaseClient;

/**
 * 在这台服务器上直接验证密码（需要 service role 钥匙）。
 * 全新安装时账本还没有主人：第一次设密码的人成为主人，这里顺便建好他的内部账号。
 */
async function verifyLocally(admin: Admin, passcode: string, setup: boolean): Promise<Verified> {
  const call = async () => {
    const { data, error } = await admin.rpc("app_passcode_login", { p_passcode: passcode, p_setup: setup });
    return error || !data ? { status: "error" } : (data as { status: string; owner_id?: string });
  };

  let result = await call();
  if (result.status === "noowner") {
    if (!setup) return { status: "unset" };
    // 这个邮箱只是内部标识，不会收发邮件；登录永远只靠 6 位密码
    const { data: created, error } = await admin.auth.admin.createUser({
      email: `owner-${randomBytes(6).toString("hex")}@example.com`,
      password: randomBytes(32).toString("base64url"),
      email_confirm: true,
    });
    if (error || !created.user) return { status: "error" };
    const { error: insertError } = await admin.from("app_passcode").insert({ owner_id: created.user.id });
    if (insertError) {
      // 另一个请求抢先建好了主人：把刚建的多余账号删掉
      await admin.auth.admin.deleteUser(created.user.id);
    }
    result = await call();
  }
  if (result.status !== "ok" || !("owner_id" in result) || !result.owner_id) return result;

  const { data: owner } = await admin.auth.admin.getUserById(result.owner_id);
  if (!owner?.user?.email) return { status: "error" };
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: owner.user.email });
  if (!link?.properties?.hashed_token) return { status: "error" };
  return { status: "ok", token_hash: link.properties.hashed_token, type: link.properties.verification_type };
}

/** 没有 service role 钥匙的部署：交给 Supabase Edge Function `passcode-login` 做同样的事 */
async function verifyViaEdgeFunction(passcode: string, setup: boolean): Promise<Verified> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/passcode-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ passcode, setup }),
      cache: "no-store",
    });
    return (await res.json()) as Verified;
  } catch {
    return { status: "error" };
  }
}

/**
 * 登录：只凭 6 位密码。密码在服务器验证（连错 5 次锁 15 分钟），
 * 通过后拿到一次性令牌，在这里换成会话 cookie。令牌不会经过浏览器。
 */
export async function passcodeLogin(passcode: string, setup = false): Promise<PasscodeResult> {
  if (!/^\d{6}$/.test(passcode)) return { status: "invalid" };

  const key = serviceRoleKey();
  const result = key
    ? await verifyLocally(
        createAdminClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }),
        passcode,
        setup,
      )
    : await verifyViaEdgeFunction(passcode, setup);

  if (result.status === "wrong") return { status: "wrong", remaining: Number(result.remaining ?? 0) };
  if (result.status === "locked") return { status: "locked", seconds: Number(result.seconds ?? 900) };
  if (result.status === "unset") return { status: "unset" };
  if (result.status !== "ok" || typeof result.token_hash !== "string") return { status: "error" };

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: result.token_hash,
    type: (result.type as EmailOtpType) ?? "magiclink",
  });
  return error ? { status: "error" } : { status: "ok" };
}

/** 已经进入 App 后修改密码 */
export async function changeAppPasscode(passcode: string): Promise<{ ok: boolean }> {
  if (!/^\d{6}$/.test(passcode)) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_app_passcode", { p_new: passcode });
  return { ok: !error };
}
