import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseReceipt } from "@/lib/receiptParser";
import { CATEGORY_CHOICES, dayHeading, malaysiaNow, rm, todayISO } from "@/lib/mobile";
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
    const rate = await rateToMYR(parsed.currency);
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

  const supabase = createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );

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
  const result = (saved ?? {}) as { id?: string; category?: string; needs_review?: boolean };
  const category = result.category ?? parsed.categoryLabel;
  const summary = `${rm(amountMYR)}${from}${who}`;
  const tail = filedUnder;

  // 分类拿不准：这笔已经先记下了（暂时放在 category），同时让快捷指令弹出选单问用户。
  // 旧版快捷指令不认识 ask，只会显示 message；那笔会留在 App 首页的“还没分类”里等用户选。
  if (result.needs_review && result.id) {
    return reply(200, `✅ 已记账 ${summary} · 还没分类${tail}`, {
      parsed,
      amountMYR,
      category,
      ask: 1,
      id: result.id,
      remember: parsed.ask === "unknown" ? 1 : 0,
      question: `${summary}\n这笔算哪一类？`,
      // 把猜的那一类放最前面，通常点第一个就对
      choices: [...CATEGORY_CHOICES].sort((a, b) => Number(b.label === category) - Number(a.label === category)).map((c) => c.text),
    });
  }

  return reply(200, `✅ 已记账 ${summary} · ${category}${tail}`, { parsed, amountMYR, category });
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

  const picked = String(body.category ?? "");
  const choice = CATEGORY_CHOICES.find((c) => c.text === picked || c.label === picked) ??
    CATEGORY_CHOICES.find((c) => c.label !== "其他支出" && picked.includes(c.label));
  const label = choice?.label ?? "其他支出";

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
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
