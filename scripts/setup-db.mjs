// 部署时自动建好数据库（在 `npm run build` 里、next build 之前执行）。
// 用 Vercel 的 Supabase 集成部署时，Vercel 会注入数据库连接串，这里拿它跑 supabase/setup.sql。
// setup.sql 可以重复执行，所以每次部署都跑一遍，以后加了新表也会自动补上。
// 没有连接串（例如本机开发，或手动填变量的部署）就直接跳过。
import { readFile } from "node:fs/promises";
import pg from "pg";

const url =
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL;

if (!url) {
  console.log("[setup-db] 没有数据库连接串，跳过自动建表。");
  process.exit(0);
}

// Supabase 的证书链在构建机上不一定验证得过；连接串本身已经指定了主机，这里只要求加密传输。
const connectionString = url.replace(/([?&])sslmode=[^&]*&?/, "$1").replace(/[?&]$/, "");
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

try {
  const sql = await readFile(new URL("../supabase/setup.sql", import.meta.url), "utf8");
  await client.connect();
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  // 让 Supabase 的 API 马上认得新建的表和函数
  await client.query("notify pgrst, 'reload schema'");
  console.log("[setup-db] 数据库已就绪。");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error("[setup-db] 建表失败：", error.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
