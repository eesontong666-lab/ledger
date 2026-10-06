import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseReceipt, parseReceiptList, type ListEntry } from "@/lib/receiptParser";
import { CATEGORY_CHOICES, categoryChoiceText, dayHeading, malaysiaNow, rm, todayISO } from "@/lib/mobile";
import { formatForeign, rateToMYR } from "@/lib/fx";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// iPhone 快捷指令调用：截图 → 提取文本 → POST 过来。
// 没有登录 cookie，靠密钥识别用户。密钥有两种带法：
//   /api/capture/<密钥>            （新版快捷指令：整条网址就是“专属链接”，只要贴一次）
//   /api/capture + Authorization 头 （旧版快捷指令）
// 回复里的 message 会被快捷指令用「显示通知」弹出来，所以都写成给人看的句子。

function reply(status: number, message: string, extra: Record<string, unknown> = {}) {
  return Response.json({ ok: status === 200, message, ...extra }, { status });
}

export async function handleCapture(request: Request, token: string | undefined) {
  if (!token) return reply(401, "缺少密钥，请在 App 的「自动化」页面生成后填进快捷指令。");

  let text = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const body = await request.json();
      text = String(body.text ?? "");
    } else if (contentType.includes("form")) {
      const form = await request.formData();
      text = String(form.get("text") ?? "");
    } else {
      text = await request.text();
    }
  } catch {
    return reply(400, "读不到截图文字。");
  }

  if (!text.trim()) return reply(400, "截图里没有识别到文字。");

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });

  // 先看是不是“一张截图里有好几笔”的列表（银行的活动记录）
  const list = parseReceiptList(text, malaysiaNow());
  if (list) return captureList(supabase, token, text, list);

  const parsed = parseReceipt(text, malaysiaNow());
  if (!parsed.amount) {
    return reply(422, "没在截图里找到金额，这笔没有记录。", { parsed });
  }

  // 记账一律用马币。截图上只有外币时，按当天汇率换算，并把原本的外币金额一起存下来。
  // 日期用截图上写的交易日期（这样补记旧的交易会算进正确的月份）；截图没写才用今天
  const today = todayISO();
  const occurredOn = parsed.occurredOn ?? today;
  // 不是今天的，在通知里讲清楚记到了哪一天，免得用户在今天的列表里找不到
  const filedUnder = occurredOn === today ? "" : `（记在 ${dayHeading(occurredOn).label}）`;

  let amountMYR = parsed.amount;
  let original = parsed.original;
  if (parsed.currency !== "MYR") {
    const rate = await rateToMYR(parsed.currency, occurredOn, today);
    if (!rate) {
      return reply(
        422,
        `认出了 ${formatForeign(parsed.amount, parsed.currency)}，但暂时拿不到 ${parsed.currency} 的汇率，这笔没有记录。请稍后再试，或手动记一笔。`,
        { parsed },
      );
    }
    original = { amount: parsed.amount, currency: parsed.currency };
    amountMYR = Math.max(0.01, Math.round(parsed.amount * rate * 100) / 100);
  }

  const { data: saved, error } = await supabase.rpc("capture_transaction", {
    p_token: token,
    p_amount: amountMYR,
    p_merchant: parsed.merchant ?? "",
    p_category_label: parsed.categoryLabel,
    p_occurred_on: occurredOn,
    p_raw_text: text,
    p_original_amount: original?.amount,
    p_original_currency: original?.currency,
    p_uncertain: parsed.ask !== null,
  });

  if (error) {
    if (error.message.includes("invalid token")) {
      return reply(401, "密钥无效或已重新生成，请更新快捷指令里的密钥。");
    }
    return reply(500, `记账失败：${error.message}`);
  }

  const who = parsed.merchant ? ` · ${parsed.merchant}` : "";
  const from = original ? `（${formatForeign(original.amount, original.currency)}）` : "";
  // 数据库可能用了“用户以前给这个商家选的分类”，以它返回的为准
  const result = (saved ?? {}) as SavedOne;
  const category = result.category ?? parsed.categoryLabel;
  const summary = `${rm(amountMYR)}${from}${who}`;
  // 有好几个账户、又认不出是哪一个：让快捷指令弹出账户选单
  const accountAsk = result.needs_account && result.id ? accountQuestion(result.id, result.accounts, summary) : {};
  const tail = filedUnder;

  // 分类拿不准：这笔已经先记下了（暂时放在 category），同时让快捷指令弹出选单问用户。
  // 旧版快捷指令不认识 ask，只会显示 message；那笔会留在 App 首页的“还没分类”里等用户选。
  if (result.needs_review && result.id) {
    return reply(200, `✅ 已记账 ${summary} · 还没分类${tail}`, {
      parsed,
      amountMYR,
      category,
      ...accountAsk,
      ask: 1,
      id: result.id,
      remember: parsed.ask === "unknown" ? 1 : 0,
      question: `${summary}\n这笔算哪一类？`,
      // 把猜的那一类放最前面，通常点第一个就对
      choices: (await expenseChoices(supabase))
        .sort((a, b) => Number(b.label === category) - Number(a.label === category))
        .map((c) => c.text),
    });
  }

  const into = result.account ? ` → ${result.account}` : "";
  return reply(200, `✅ 已记账 ${summary} · ${category}${into}${tail}`, {
    parsed,
    amountMYR,
    category,
    id: result.id,
    ...accountAsk,
  });
}

type Db = ReturnType<typeof createClient<Database>>;

// capture_transaction 返回的东西
type SavedOne = {
  id?: string;
  category?: string;
  needs_review?: boolean;
  needs_account?: boolean;
  /** 已经自动记到的账户名字（没有就是 null） */
  account?: string | null;
  /** 需要问的时候，用户所有账户的名字 */
  accounts?: string[] | null;
};

/** 让快捷指令弹出“用哪个账户付的？”所需要的栏位。ids 可以是一个 id，或用逗号隔开的好几个。 */
function accountQuestion(ids: string, accounts: string[] | null | undefined, what: string) {
  if (!accounts?.length) return {};
  return { ask_account: 1, ids, account_question: `${what}\n用哪个账户付的？`, account_choices: accounts };
}

/** 所有支出分类（包括用户自己加的），照顺序排好，附上选单要显示的文字 */
async function expenseChoices(supabase: Db): Promise<{ label: string; text: string }[]> {
  const { data } = await supabase
    .from("categories")
    .select("label_zh, icon, sort_order")
    .eq("type", "expense")
    .order("sort_order")
    .order("label_zh");
  const rows = data?.length ? data : CATEGORY_CHOICES.map((c) => ({ label_zh: c.label, icon: null }));
  return rows.map((c) => ({ label: c.label_zh, text: categoryChoiceText(c.label_zh, c.icon) }));
}

// 跟数据库里的 merchant_key() 一样的算法：只留字母数字、全大写
function merchantKey(name: string | null): string {
  return (name ?? "").replace(/[^\p{L}\p{N}]+/gu, "").toUpperCase();
}

/** 一张截图里的好几笔交易，一次记下。已经记过的（之前敲过两下的）会跳过。 */
async function captureList(supabase: Db, token: string, text: string, list: ListEntry[]) {
  const today = todayISO();
  const seen = new Map<string, number>();
  const items = list.map((e) => {
    const date = e.occurredOn ?? today;
    const key = `${date}|${e.amount.toFixed(2)}|${merchantKey(e.merchant)}`;
    const nth = (seen.get(key) ?? 0) + 1;
    seen.set(key, nth);
    return { amount: e.amount, merchant: e.merchant ?? "", category: e.categoryLabel, date, uncertain: e.ask !== null, nth };
  });

  const { data, error } = await supabase.rpc("capture_transactions_bulk", {
    p_token: token,
    p_items: items,
    p_raw_text: text,
  });
  if (error) {
    if (error.message.includes("invalid token")) {
      return reply(401, "密钥无效或已重新生成，请更新快捷指令里的密钥。");
    }
    return reply(500, `记账失败：${error.message}`);
  }

  const result = (data ?? {}) as { added?: number; skipped?: number; results?: (SavedOne & { skipped?: boolean })[] };
  const added = result.added ?? 0;
  const skipped = result.skipped ?? 0;
  if (added === 0) {
    return reply(200, `这张截图里的 ${skipped} 笔都已经记过了，没有重复记。`, { added, skipped });
  }

  const rows = (result.results ?? []).map((r, i) => ({ ...r, item: items[i] })).filter((r) => r.item && !r.skipped);
  const total = rows.reduce((sum, r) => sum + r.item.amount, 0);
  const pending = rows.filter((r) => r.needs_review).length;
  const shown = rows
    .slice(0, 4)
    .map((r) => `· ${rm(r.item.amount)} ${r.item.merchant || "（没读到商家）"} · ${(r.category ?? r.item.category).replace("支出", "")}`);
  if (rows.length > shown.length) shown.push(`…还有 ${rows.length - shown.length} 笔`);

  const head =
    `✅ 记了 ${added} 笔，共 ${rm(total)}` +
    (skipped > 0 ? `（跳过 ${skipped} 笔已经记过的）` : "") +
    (pending > 0 ? `。${pending} 笔还没分类，打开 App 选一下` : "");
  // 这张截图里的几笔要一起问“用哪个账户付的”
  const needAccount = rows.filter((r) => r.needs_account && r.id);
  const accountAsk = needAccount.length
    ? accountQuestion(
        needAccount.map((r) => r.id).join(","),
        needAccount[0].accounts,
        `${needAccount.length} 笔，共 ${rm(needAccount.reduce((sum, r) => sum + r.item.amount, 0))}`,
      )
    : {};
  return reply(200, [head, ...shown].join("\n"), { added, skipped, pending, ...accountAsk });
}

/** 快捷指令弹出选单后，把用户选的那一项送回来（body: { id, category: 选单上的文字, remember }） */
export async function handleSetCategory(request: Request, token: string | undefined) {
  if (!token) return reply(401, "缺少密钥。");
  let body: { id?: unknown; category?: unknown; remember?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400, "读不到你选的分类。");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const picked = String(body.category ?? "").trim();
  const all = await expenseChoices(supabase);
  // 先找完全一样的；找不到再看选的那串字里包含哪个分类名（名字长的先比，免得“食”抢了“零食”）
  const choice =
    all.find((c) => c.text === picked || c.label === picked) ??
    [...all].sort((a, b) => b.label.length - a.label.length).find((c) => c.label !== "其他支出" && picked.includes(c.label));
  const label = choice?.label ?? "其他支出";

  const { error } = await supabase.rpc("capture_set_category", {
    p_token: token,
    p_id: String(body.id ?? ""),
    p_category_label: label,
    p_remember: !(body.remember === 0 || body.remember === "0" || body.remember === false),
  });
  if (error) {
    if (error.message.includes("invalid token")) return reply(401, "密钥无效或已重新生成。");
    return reply(500, "分类没有保存成功，请打开 App 再选一次。");
  }
  return reply(200, `👌 已归到「${label.replace("支出", "")}」`, { category: label });
}

/** 快捷指令弹出账户选单后，把用户选的账户送回来（body: { ids, account: 账户名字 }） */
export async function handleSetAccount(request: Request, token: string | undefined) {
  if (!token) return reply(401, "缺少密钥。");
  let body: { ids?: unknown; id?: unknown; account?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply(400, "读不到你选的账户。");
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("capture_set_account", {
    p_token: token,
    p_ids: String(body.ids ?? body.id ?? ""),
    p_account_name: String(body.account ?? ""),
  });
  if (error) {
    if (error.message.includes("invalid token")) return reply(401, "密钥无效或已重新生成。");
    return reply(500, "账户没有保存成功，请打开 App 再选一次。");
  }
  const result = (data ?? {}) as { account?: string; balance?: number; count?: number };
  const many = (result.count ?? 1) > 1 ? `${result.count} 笔都` : "";
  return reply(200, `👌 ${many}记到 ${result.account}，余额 ${rm(Number(result.balance ?? 0))}`, result);
}
