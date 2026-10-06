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

/** 某一天的汇率（欧洲央行的每日参考汇率）。周末、假期会给最近一个工作日的。 */
async function fromFrankfurterOn(base: string, date: string): Promise<number | null> {
  const res = await fetch(`https://api.frankfurter.dev/v1/${date}?base=${base}&symbols=MYR`, {
    // 过去某一天的汇率不会再变，可以放心缓存很久
    next: { revalidate: 30 * 24 * 60 * 60 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { rates?: Record<string, number> };
  return data.rates?.MYR ?? null;
}

/**
 * 1 单位外币等于多少马币。拿不到时返回 null（调用方应该拒绝记账，而不是乱猜）。
 * onDate（YYYY-MM-DD）：交易发生的那一天。补记以前的消费时用那一天的汇率；
 * 不传、是今天、或那一天的汇率拿不到时，用最新的汇率。
 */
export async function rateToMYR(currency: string, onDate?: string | null, today?: string): Promise<number | null> {
  const code = currency.toUpperCase();
  if (code === "MYR") return 1;
  const base = PEGGED_TO_USD.has(code) ? "USD" : code;
  if (!/^[A-Z]{3}$/.test(base)) return null;

  const usable = (rate: number | null) => (rate && Number.isFinite(rate) && rate > 0 ? rate : null);

  if (onDate && /^\d{4}-\d{2}-\d{2}$/.test(onDate) && onDate !== today) {
    try {
      const past = usable(await fromFrankfurterOn(base, onDate));
      if (past) return past;
    } catch {
      // 拿不到历史汇率就用最新的
    }
  }

  for (const source of [fromErApi, fromFrankfurter]) {
    try {
      const rate = usable(await source(base));
      if (rate) return rate;
    } catch {
      // 换下一个来源
    }
  }
  return null;
}

/** 显示用：USD 10.00、USDT 12.5、IDR 25,000 */
export function formatForeign(amount: number, currency: string): string {
  // 没有小数的货币不补 .00；其他至少两位；加密货币的小数原样保留（最多 8 位）
  const noDecimals = ["IDR", "VND", "JPY", "KRW"].includes(currency);
  const decimals = (String(amount).split(".")[1] ?? "").length;
  const digits = noDecimals ? Math.min(decimals, 2) : Math.min(8, Math.max(2, decimals));
  return `${currency} ${amount.toLocaleString("en-MY", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
