import type { Database } from "@/lib/database.types";
import { formatMYR } from "@/lib/constants";

type Asset = Database["public"]["Tables"]["assets"]["Row"];
type Liability = Database["public"]["Tables"]["liabilities"]["Row"];
type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Budget = Database["public"]["Tables"]["budgets"]["Row"];
type SavingsGoal = Database["public"]["Tables"]["savings_goals"]["Row"];

export function computeNetWorth(assets: Asset[], liabilities: Liability[]) {
  const totalAssets = assets.reduce((sum, a) => sum + Number(a.balance), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + Number(l.balance), 0);
  return {
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
  };
}

export interface BudgetLine {
  categoryId: string;
  limitAmount: number;
  spent: number;
  remaining: number;
  overBudget: boolean;
}

export function computeBudgetVsActual(
  budgets: Budget[],
  transactions: Transaction[],
): BudgetLine[] {
  const spentByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    spentByCategory.set(
      t.category_id,
      (spentByCategory.get(t.category_id) ?? 0) + Number(t.amount),
    );
  }

  return budgets.map((b) => {
    const spent = spentByCategory.get(b.category_id) ?? 0;
    const limitAmount = Number(b.limit_amount);
    return {
      categoryId: b.category_id,
      limitAmount,
      spent,
      remaining: limitAmount - spent,
      overBudget: spent > limitAmount,
    };
  });
}

export function computeGoalProgress(goal: SavingsGoal) {
  const target = Number(goal.target_amount);
  const current = Number(goal.current_amount);
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  return {
    current,
    target,
    percent: Math.round(ratio * 100),
    complete: current >= target,
  };
}

export function sumByType(transactions: Transaction[], type: "income" | "expense") {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export function groupSpendByCategory(transactions: Transaction[]) {
  const map = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount));
  }
  return map;
}

// ========== 财务体检 (financial checkup) ==========
// Rule-of-thumb calculators the user specified. These are general, widely-used
// budgeting heuristics (e.g. the 20/12 car rule, the 4%-rule-derived "25x/300x"
// FI number, a 50/20/30-style allocation split) — not personalized investment
// or credit advice. Output is framed as "参考方向", not a directive.

export interface CarAffordability {
  downPayment: number;
  maxAffordableCarPrice: number;
  monthlyInstallmentLimit: number;
  maxLoanYears: number;
  targetCarPrice: number | null;
  withinBudget: boolean | null;
}

export function computeCarAffordability(
  monthlyIncome: number,
  targetCarPrice: number | null,
): CarAffordability {
  const maxAffordableCarPrice = monthlyIncome * 12;
  const monthlyInstallmentLimit = monthlyIncome * 0.15;
  const downPayment = (targetCarPrice ?? maxAffordableCarPrice) * 0.2;
  return {
    downPayment,
    maxAffordableCarPrice,
    monthlyInstallmentLimit,
    maxLoanYears: 7,
    targetCarPrice,
    withinBudget:
      targetCarPrice === null ? null : targetCarPrice <= maxAffordableCarPrice,
  };
}

export interface AllocationPlan {
  fiNumber: number;
  monthlyInvestment: number;
  livingExpenseBudget: number;
  emergencyFundTarget: number;
}

export function computeAllocationPlan(
  monthlyIncome: number,
  monthlyExpense: number,
): AllocationPlan {
  return {
    fiNumber: monthlyIncome * 300,
    monthlyInvestment: monthlyIncome * 0.2,
    livingExpenseBudget: monthlyIncome * 0.5,
    emergencyFundTarget: monthlyExpense * 6,
  };
}

export interface EmergencyFundStatus {
  target: number;
  current: number;
  fundedRatio: number;
  isFunded: boolean;
}

export function computeEmergencyFundStatus(
  monthlyExpense: number,
  currentLiquidSavings: number,
): EmergencyFundStatus {
  const target = monthlyExpense * 6;
  const fundedRatio = target > 0 ? Math.min(currentLiquidSavings / target, 1) : 0;
  return {
    target,
    current: currentLiquidSavings,
    fundedRatio,
    isFunded: currentLiquidSavings >= target,
  };
}

export type SpendingStyle =
  | "daily_life"
  | "online_shopping"
  | "travel"
  | "dining"
  | "mixed";

const CARD_TYPE_DIRECTIONS: Record<SpendingStyle, string[]> = {
  daily_life: ["无年费基础现金回扣卡", "超市/加油站类别加成卡"],
  online_shopping: ["网购类别高回扣卡", "线上支付/电子钱包加成卡"],
  travel: ["里程/旅行奖励卡", "海外消费免手续费卡"],
  dining: ["餐饮类别高回扣卡", "本地生活优惠联名卡"],
  mixed: ["综合现金回扣卡（不限类别）", "低门槛无年费卡"],
};

export function recommendCardDirection(style: SpendingStyle | null) {
  if (!style) return [];
  return CARD_TYPE_DIRECTIONS[style];
}

export interface PropertyReadiness {
  debtToIncomeRatio: number;
  debtToIncomeOk: boolean;
  emergencyFundOk: boolean;
  hasInvestingHabit: boolean;
  ready: boolean;
  checklist: { label: string; passed: boolean; detail: string }[];
}

export function assessPropertyReadiness(input: {
  monthlyIncome: number;
  existingMonthlyDebt: number;
  emergencyFundOk: boolean;
  emergencyFundCurrent: number;
  emergencyFundTarget: number;
  monthlyInvestmentAmount: number;
}): PropertyReadiness {
  const debtToIncomeRatio =
    input.monthlyIncome > 0 ? input.existingMonthlyDebt / input.monthlyIncome : 1;
  const debtToIncomeOk = debtToIncomeRatio <= 0.4;
  const hasInvestingHabit = input.monthlyInvestmentAmount > 0;

  const checklist = [
    {
      label: "紧急备用金已备足（≥6个月生活开销）",
      passed: input.emergencyFundOk,
      detail: `当前 ${formatMYR(input.emergencyFundCurrent)} / 目标 ${formatMYR(input.emergencyFundTarget)}`,
    },
    {
      label: "现有每月还款不超过收入的 40%（DSR 健康）",
      passed: debtToIncomeOk,
      detail: `DSR ${(debtToIncomeRatio * 100).toFixed(0)}%（每月还款 ${formatMYR(input.existingMonthlyDebt)} ÷ 月收入 ${formatMYR(input.monthlyIncome)}）`,
    },
    {
      label: "已有稳定的每月投资/储蓄习惯",
      passed: hasInvestingHabit,
      detail: `建议每月投资额 ${formatMYR(input.monthlyInvestmentAmount)}`,
    },
  ];

  return {
    debtToIncomeRatio,
    debtToIncomeOk,
    emergencyFundOk: input.emergencyFundOk,
    hasInvestingHabit,
    ready: checklist.every((c) => c.passed),
    checklist,
  };
}
