// 外币 → 马币的汇率。用免费、不需要钥匙的公开汇率（每天更新一次），结果缓存 6 小时。
// 这是市场中间价，跟银行/信用卡实际扣的会差一点（通常 1–3%），记账够用，不能当作对账单。

// 稳定币跟美元 1:1 挂钩，直接当美元算
const PEGGED_TO_USD = new Set(["USDT", "USDC", "BUSD", "DAI"]);

const SIX_HOURS = 6 * 60 * 60;

async function fromErApi(base: string): Promise<number | null> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`, { next: { revalidate: SIX_HOURS } });
  if (!res.ok) return null;
  const data = (await res.json()) as { result?: string; rates?: Record<string, number> };
  return data.result === "success" ? (data.rates?.MYR ?? null) : null;
}

async function fromFrankfurter(base: string): Promise<number | null> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=MYR`, {
    next: { revalidate: SIX_HOURS },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { rates?: Record<string, number> };
  return data.rates?.MYR ?? null;
}

/** 1 单位外币等于多少马币。拿不到时返回 null（调用方应该拒绝记账，而不是乱猜）。 */
export async function rateToMYR(currency: string): Promise<number | null> {
  const code = currency.toUpperCase();
  if (code === "MYR") return 1;
  const base = PEGGED_TO_USD.has(code) ? "USD" : code;
  if (!/^[A-Z]{3}$/.test(base)) return null;

  for (const source of [fromErApi, fromFrankfurter]) {
    try {
      const rate = await source(base);
      if (rate && Number.isFinite(rate) && rate > 0) return rate;
    } catch {
      // 换下一个来源
    }
  }
  return null;
}

/** 显示用：USD 10.00、USDT 12.5、IDR 25,000 */
export function formatForeign(amount: number, currency: string): string {
  const digits = Number.isInteger(amount) ? 0 : Math.min(8, Math.max(2, (String(amount).split(".")[1] ?? "").length));
  return `${currency} ${amount.toLocaleString("en-MY", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
