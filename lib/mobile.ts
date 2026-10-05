// 手机版共用的展示工具

/** 记收入时账户下拉里「按比例分配」这个选项的值 */
export const SPLIT_CHOICE = "__split__";

export const CATEGORY_EMOJI: Record<string, string> = {
  工资: "💼",
  奖金: "🎁",
  投资收益: "📈",
  其他收入: "💰",
  衣: "👕",
  食: "🍜",
  住: "🏠",
  行: "🚗",
  其他支出: "🧾",
};

export function categoryEmoji(label: string | undefined | null): string {
  return (label && CATEGORY_EMOJI[label]) || "🧾";
}

export const ASSET_EMOJI: Record<string, string> = {
  cash: "💵",
  savings: "🏦",
  investment: "📈",
  property: "🏡",
  other_asset: "👛",
};

export const LIABILITY_EMOJI: Record<string, string> = {
  loan: "🧾",
  credit_card: "💳",
  mortgage: "🏠",
  other_liability: "📉",
};

// 账户卡片轮流用的底色（参照钱包叠卡）
export const ACCOUNT_TINTS = [
  "from-emerald-900/70 to-emerald-950/40 border-emerald-700/40",
  "from-sky-900/70 to-sky-950/40 border-sky-700/40",
  "from-fuchsia-900/60 to-fuchsia-950/40 border-fuchsia-700/40",
  "from-amber-900/60 to-amber-950/40 border-amber-700/40",
  "from-teal-900/70 to-teal-950/40 border-teal-700/40",
  "from-indigo-900/70 to-indigo-950/40 border-indigo-700/40",
];

export function rm(amount: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(amount).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = opts.sign ? (amount < 0 ? "-" : "+") : amount < 0 ? "-" : "";
  return `${sign}RM${abs}`;
}

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function dayHeading(isoDate: string): { label: string; weekday: string } {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return { label: `${m}月${d}日`, weekday: WEEKDAYS[date.getDay()] };
}

/**
 * “现在”的马来西亚时间。服务器（Vercel）的时钟是 UTC，比马来西亚慢 8 小时，
 * 直接用 new Date() 的话，半夜到早上 8 点之间会把“今天”算成昨天、月初算成上个月。
 * 返回的 Date 只能拿来读年月日时分（getFullYear / getMonth / getDate…）。
 */
export function malaysiaNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" }));
}

export function todayISO(): string {
  const now = malaysiaNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function monthRange(ym?: string): { start: string; end: string; year: number; month: number } {
  const now = malaysiaNow();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    [year, month] = ym.split("-").map(Number);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
  return { start: `${year}-${pad(month)}-01`, end: `${next.y}-${pad(next.m)}-01`, year, month };
}

export function shiftMonth(year: number, month: number, delta: number): string {
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 目标进度。绑定了账户就看账户余额，否则看手动存入的累计。 */
export function goalProgress(
  goal: { target_amount: number | string; current_amount: number | string; target_date: string | null },
  linkedBalance: number | null,
) {
  const target = Number(goal.target_amount);
  const saved = Math.max(0, linkedBalance ?? Number(goal.current_amount));
  const percent = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const remaining = Math.max(0, target - saved);

  let daysLeft: number | null = null;
  let perMonth: number | null = null;
  if (goal.target_date) {
    const [y, m, d] = goal.target_date.split("-").map(Number);
    daysLeft = Math.ceil((new Date(y, m - 1, d).getTime() - malaysiaNow().getTime()) / 86_400_000);
    if (daysLeft > 0 && remaining > 0) perMonth = remaining / Math.max(1, daysLeft / 30.44);
  }
  return { target, saved, percent, remaining, daysLeft, perMonth, done: saved >= target && target > 0 };
}

/** 收入按比例拆到各账户。用“分”来算，最后一个账户吃掉四舍五入的差额，保证加起来刚好等于总数。 */
export function splitIncome<T extends { percent: number }>(total: number, parts: T[]): (T & { amount: number })[] {
  const active = parts.filter((p) => p.percent > 0);
  const totalCents = Math.round(total * 100);
  const percentSum = active.reduce((s, p) => s + p.percent, 0);
  let used = 0;
  return active.map((p, i) => {
    const cents = i === active.length - 1 ? totalCents - used : Math.round((totalCents * p.percent) / percentSum);
    used += cents;
    return { ...p, amount: cents / 100 };
  });
}

/** 问用户“这笔算哪一类”时的选项。快捷指令的选单和 App 首页的待分类都用这一份。 */
export const CATEGORY_CHOICES: { label: string; text: string }[] = [
  { label: "食", text: "🍜 食 · 吃喝买菜" },
  { label: "衣", text: "👕 衣 · 服饰购物" },
  { label: "住", text: "🏠 住 · 房租水电家用" },
  { label: "行", text: "🚗 行 · 交通油费" },
  { label: "其他支出", text: "🧾 其他" },
];

/** 这个时间点是不是在最近 N 小时内 */
export function withinLastHours(iso: string, hours: number): boolean {
  return Date.now() - new Date(iso).getTime() < hours * 60 * 60 * 1000;
}
