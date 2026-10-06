"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/lib/types";
import { ASK_ACCOUNT, PROTECTED_CATEGORIES, SPLIT_CHOICE, splitIncome, todayISO } from "@/lib/mobile";
import { identifyMerchant } from "@/lib/brands";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateMobile() {
  for (const path of ["/home", "/accounts", "/stats", "/transactions", "/dashboard", "/net-worth"]) {
    revalidatePath(path);
  }
  // 分类明细、账户明细这些带参数的页面也要刷新，返回时才会看到改过的结果
  revalidatePath("/stats/[categoryId]", "page");
  revalidatePath("/accounts/[id]", "page");
}

export async function createMobileTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const type = String(formData.get("type")) as CategoryType;
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  const assetChoice = (formData.get("asset_id") as string) || null;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("金额不正确");

  const base = {
    user_id: user.id,
    category_id: String(formData.get("category_id")),
    type,
    occurred_on: String(formData.get("occurred_on")),
    merchant: (formData.get("merchant") as string)?.trim() || null,
    note: (formData.get("note") as string)?.trim() || null,
    source: "manual",
  };

  // 收入可以选「按比例分配」：按各账户设定的 % 拆成几笔，每个账户各记一笔
  let parts: { assetId: string | null; amount: number; balance: number | null }[];
  if (type === "income" && assetChoice === SPLIT_CHOICE) {
    const { data: accounts } = await supabase
      .from("assets")
      .select("id, balance, income_split_percent")
      .gt("income_split_percent", 0)
      .order("created_at");
    if (!accounts?.length) throw new Error("还没有设定收入分配比例");
    parts = splitIncome(
      amount,
      accounts.map((a) => ({ assetId: a.id, balance: Number(a.balance), percent: Number(a.income_split_percent) })),
    );
  } else if (assetChoice && assetChoice !== SPLIT_CHOICE) {
    const { data: asset } = await supabase.from("assets").select("balance").eq("id", assetChoice).single();
    parts = [{ assetId: assetChoice, amount, balance: asset ? Number(asset.balance) : null }];
  } else {
    parts = [{ assetId: null, amount, balance: null }];
  }

  const { error } = await supabase
    .from("transactions")
    .insert(parts.filter((p) => p.amount > 0).map((p) => ({ ...base, amount: p.amount, asset_id: p.assetId })));
  if (error) throw new Error(error.message);

  // 记在某个账户上时，同步调整账户余额
  for (const p of parts) {
    if (!p.assetId || p.balance === null || p.amount <= 0) continue;
    const delta = type === "income" ? p.amount : -p.amount;
    await supabase
      .from("assets")
      .update({ balance: p.balance + delta, updated_at: new Date().toISOString() })
      .eq("id", p.assetId)
      .eq("user_id", user.id);
  }

  revalidateMobile();
  redirect("/home");
}

/** 保存各账户的收入分配比例。加起来必须是 100（或全部 0 = 关闭）。 */
export async function saveIncomeSplit(_prev: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const { supabase, user } = await requireUser();
  const entries = [...formData.entries()]
    .filter(([key]) => key.startsWith("pct_"))
    .map(([key, value]) => ({ id: key.slice(4), percent: Number(value) || 0 }));

  if (entries.some((e) => e.percent < 0 || e.percent > 100)) return { ok: false, message: "每一项要在 0 到 100 之间" };
  const sum = Math.round(entries.reduce((s, e) => s + e.percent, 0) * 100) / 100;
  if (sum !== 100 && sum !== 0) return { ok: false, message: `现在加起来是 ${sum}%，要刚好 100% 才能保存` };

  for (const e of entries) {
    const { error } = await supabase
      .from("assets")
      .update({ income_split_percent: e.percent })
      .eq("id", e.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };
  }
  revalidatePath("/settings/split");
  revalidatePath("/add");
  return { ok: true, message: sum === 0 ? "已关闭收入分配" : "✅ 已保存" };
}

export async function deleteMobileTransaction(id: string) {
  const { supabase, user } = await requireUser();
  const { data: tx } = await supabase
    .from("transactions")
    .select("amount, type, asset_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);

  if (tx?.asset_id) {
    const { data: asset } = await supabase.from("assets").select("balance").eq("id", tx.asset_id).single();
    if (asset) {
      const delta = tx.type === "income" ? -Number(tx.amount) : Number(tx.amount);
      await supabase
        .from("assets")
        .update({ balance: Number(asset.balance) + delta, updated_at: new Date().toISOString() })
        .eq("id", tx.asset_id)
        .eq("user_id", user.id);
    }
  }
  revalidateMobile();
}

export async function updateTransactionCategory(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: tx, error } = await supabase
    .from("transactions")
    .update({ category_id: String(formData.get("category_id")), needs_review: false })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("merchant")
    .single();
  if (error) throw new Error(error.message);

  // 记住这个商家：以后截图记账自动用这个分类，同一商家的旧记录也一起改过来。
  // 超市、网购这种什么都卖的店不记：每次买的东西不一样，下次还是问。
  if (tx?.merchant && !identifyMerchant(tx.merchant)?.askEveryTime) {
    await supabase.rpc("remember_merchant_category", {
      p_merchant: tx.merchant,
      p_category_id: String(formData.get("category_id")),
    });
  }
  revalidateMobile();
  revalidatePath(`/tx/${id}`);
}

export async function createMobileAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  const kind = String(formData.get("kind"));
  const name = String(formData.get("name") ?? "").trim();
  const balance = Number(String(formData.get("balance") ?? "0").replace(/,/g, "")) || 0;
  if (!name) throw new Error("请填写名称");

  const { error } =
    kind === "liability"
      ? await supabase.from("liabilities").insert({ user_id: user.id, name, category: "credit_card", balance })
      : await supabase.from("assets").insert({
          user_id: user.id,
          name,
          category: kind === "investment" ? "investment" : "savings",
          balance,
        });
  if (error) throw new Error(error.message);
  revalidateMobile();
}

/** 自己加一个分类 */
export async function createCategory(_prev: unknown, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const { supabase } = await requireUser();
  const type = formData.get("type") === "income" ? "income" : "expense";
  const label = String(formData.get("label") ?? "").trim();
  // 只取第一个字符当图标（一个 emoji 可能由好几个码位组成，用 Segmenter 才切得对）
  const rawIcon = String(formData.get("icon") ?? "").trim();
  const icon = rawIcon ? [...new Intl.Segmenter().segment(rawIcon)][0].segment : "🏷️";

  if (!label) return { ok: false, message: "请填分类名称" };
  if (label.length > 8) return { ok: false, message: "名称最多 8 个字" };

  // 排在内置分类后面、“其他”前面
  const { error } = await supabase
    .from("categories")
    .insert({ type, label_zh: label, icon, sort_order: type === "expense" ? 15 : 3 });
  if (error) {
    return { ok: false, message: error.code === "23505" ? `已经有「${label}」这个分类了` : error.message };
  }
  revalidateMobile();
  revalidatePath("/settings/categories");
  revalidatePath("/add");
  return { ok: true, message: `✅ 已加上「${label}」` };
}

/** 删除一个分类：里面的记录会移到「其他」 */
export async function deleteCategory(id: string) {
  const { supabase, user } = await requireUser();
  const { data: category } = await supabase.from("categories").select("id, type, label_zh").eq("id", id).single();
  if (!category) return;
  if (PROTECTED_CATEGORIES.includes(category.label_zh)) throw new Error("这个分类不能删除");

  const fallbackLabel = category.type === "expense" ? "其他支出" : "其他收入";
  const { data: fallback } = await supabase
    .from("categories")
    .select("id")
    .eq("type", category.type)
    .eq("label_zh", fallbackLabel)
    .single();
  if (!fallback) throw new Error("找不到「其他」分类");

  await supabase.from("transactions").update({ category_id: fallback.id }).eq("category_id", id).eq("user_id", user.id);
  await supabase.from("budgets").delete().eq("category_id", id).eq("user_id", user.id);
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw new Error("删除失败：还有记录在用这个分类");

  revalidateMobile();
  revalidatePath("/settings/categories");
  revalidatePath("/add");
}

/** 改名称 / 直接改余额（银行账户、投资、负债都用这个） */
export async function updateMobileAccount(kind: "asset" | "liability", id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const balance = Number(String(formData.get("balance") ?? "").replace(/,/g, ""));
  if (!name || !Number.isFinite(balance)) throw new Error("请填写名称和金额");

  const table = kind === "liability" ? "liabilities" : "assets";
  const { error } = await supabase
    .from(table)
    .update({ name, balance, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateMobile();
  revalidatePath(kind === "liability" ? `/debts/${id}` : `/accounts/${id}`);
}

export async function deleteMobileAccount(kind: "asset" | "liability", id: string) {
  const { supabase, user } = await requireUser();
  const table = kind === "liability" ? "liabilities" : "assets";
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidateMobile();
  redirect("/accounts");
}

/** 负债记一笔变动：direction=repay 还款（欠的变少），borrow 多欠（欠的变多） */
export async function addLiabilityEntry(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const raw = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  if (!Number.isFinite(raw) || raw <= 0) throw new Error("金额不正确");
  const amount = formData.get("direction") === "repay" ? -raw : raw;

  const { data: liability } = await supabase.from("liabilities").select("balance").eq("id", id).single();
  if (!liability) throw new Error("找不到这笔负债");

  const { error } = await supabase.from("liability_entries").insert({
    liability_id: id,
    user_id: user.id,
    amount,
    note: (formData.get("note") as string)?.trim() || null,
    occurred_on: String(formData.get("occurred_on") || todayISO()),
  });
  if (error) throw new Error(error.message);

  await supabase
    .from("liabilities")
    .update({ balance: Number(liability.balance) + amount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidateMobile();
  revalidatePath(`/debts/${id}`);
}

function goalPaths(id?: string) {
  revalidatePath("/accounts");
  revalidatePath("/goals");
  if (id) revalidatePath(`/goal/${id}`);
}

export async function createMobileGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const target = Number(String(formData.get("target_amount") ?? "").replace(/,/g, ""));
  if (!name || !Number.isFinite(target) || target <= 0) throw new Error("请填写名称和目标金额");

  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name,
    target_amount: target,
    target_date: (formData.get("target_date") as string) || null,
    asset_id: (formData.get("asset_id") as string) || null,
  });
  if (error) throw new Error(error.message);
  goalPaths();
}

export async function linkGoalAccount(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("savings_goals")
    .update({ asset_id: (formData.get("asset_id") as string) || null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  goalPaths(id);
}

export async function addGoalSaving(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const amount = Number(String(formData.get("amount") ?? "").replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount === 0) throw new Error("金额不正确");
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: id,
    user_id: user.id,
    amount,
    occurred_on: todayISO(),
  });
  if (error) throw new Error(error.message);
  goalPaths(id);
}

export async function deleteMobileGoal(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_goals").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  goalPaths();
  redirect("/accounts?tab=goals");
}

/** 生成新的快捷指令密钥。旧密钥立即失效；明文只返回这一次。 */
export async function generateCaptureToken(): Promise<{ token: string }> {
  const { supabase, user } = await requireUser();
  const token = `fp_${randomBytes(24).toString("base64url")}`;
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const { error } = await supabase
    .from("capture_tokens")
    .upsert(
      { user_id: user.id, token_hash: tokenHash, created_at: new Date().toISOString(), last_used_at: null },
      { onConflict: "user_id" },
    );
  if (error) throw new Error(error.message);
  revalidatePath("/settings/automation");
  return { token };
}

/** 把一笔交易挂到某个账户（或换账户、或不挂），余额会跟着调 */
export async function setTransactionAccount(id: string, formData: FormData) {
  const { supabase } = await requireUser();
  const assetId = (formData.get("asset_id") as string) || null;
  const { error } = await supabase.rpc("set_transaction_account", { p_id: id, p_asset_id: assetId });
  if (error) throw new Error(error.message);
  revalidateMobile();
  revalidatePath(`/tx/${id}`);
}

export async function setCaptureDefaultAccount(formData: FormData) {
  const { supabase, user } = await requireUser();
  // ASK_ACCOUNT = 每次都问；空 = 不记到任何账户；其他 = 固定记到这个账户
  const choice = (formData.get("asset_id") as string) || "";
  const ask = choice === ASK_ACCOUNT;
  const assetId = ask || !choice ? null : choice;
  const { error } = await supabase
    .from("capture_tokens")
    .update({ default_asset_id: assetId, ask_account: ask })
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/automation");
}
