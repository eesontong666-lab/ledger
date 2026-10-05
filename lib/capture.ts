import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { parseReceipt } from "@/lib/receiptParser";
import { rm } from "@/lib/mobile";
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

// 服务器可能在 UTC，截图没写日期时按马来西亚时间算“今天”
function malaysiaToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
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

  const parsed = parseReceipt(text);
  if (!parsed.amount) {
    return reply(422, "没在截图里找到金额，这笔没有记录。", { parsed });
  }

  // 记账一律用马币。截图上只有外币时，按当天汇率换算，并把原本的外币金额一起存下来。
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
    p_occurred_on: parsed.occurredOn ?? malaysiaToday(),
    p_raw_text: text,
    p_original_amount: original?.amount,
    p_original_currency: original?.currency,
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
  const result = (saved ?? {}) as { category?: string; learned?: boolean };
  const category = result.category ?? parsed.categoryLabel;
  return reply(200, `✅ 已记账 ${rm(amountMYR)}${from}${who} · ${category}`, { parsed, amountMYR, category });
}
