export function formatMYR(amount: number): string {
  return `RM ${amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const ASSET_CATEGORY_LABELS: Record<string, string> = {
  cash: "现金",
  savings: "储蓄",
  investment: "投资",
  property: "房产",
  other_asset: "其他资产",
};

export const LIABILITY_CATEGORY_LABELS: Record<string, string> = {
  loan: "贷款",
  credit_card: "信用卡",
  mortgage: "房贷",
  other_liability: "其他负债",
};

export const SPENDING_STYLE_LABELS: Record<string, string> = {
  daily_life: "日常生活为主",
  online_shopping: "网购为主",
  travel: "旅行/差旅为主",
  dining: "餐饮外食为主",
  mixed: "比较平均，没有特别集中",
};

export function firstOfMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

export function monthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-");
  return `${y}年${Number(m)}月`;
}
