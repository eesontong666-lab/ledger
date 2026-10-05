// Supabase 连接设定。两种来源都支持：
// - 自己在 Vercel 填的 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// - Vercel 的 Supabase 集成自动注入的变量（新项目可能叫 PUBLISHABLE_KEY / SECRET_KEY）
// NEXT_PUBLIC_ 开头的必须写成完整的 process.env.XXX，构建时才会被替换进浏览器代码。

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL)!;

export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY)!;

/** 只在服务器上可用的最高权限钥匙。没有设定时返回 null（改走 Edge Function）。 */
export function serviceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? null;
}
