import { createClient } from "@/lib/supabase/server";
import { computeEmergencyFundStatus } from "@/lib/calculations";
import type { FinancialProfile, Liability, SavingsGoal, SpendingStyle } from "@/lib/types";

const EMERGENCY_FUND_GOAL_NAME = "紧急储备金";

export interface FinancialSnapshot {
  profile: FinancialProfile | null;
  hasProfile: boolean;
  monthlyIncome: number;
  monthlyExpense: number;
  trackedMonthlyAverage: number;
  existingMonthlyDebt: number;
  targetCarPrice: number | null;
  spendingStyle: SpendingStyle | null;
  liabilities: Liability[];
  totalLiabilitiesBalance: number;
  emergencyFundGoal: SavingsGoal | null;
  emergencyFund: ReturnType<typeof computeEmergencyFundStatus>;
}

// 财务体检等页面需要「紧急备用金」的数字，直接读用户在「目标储蓄」里手动维护的
// 「紧急储备金」目标当前金额 —— 这是用户自己认定的应急金，不是资产负债里所有
// 现金/储蓄类资产的总和（那包含了不打算当应急金用的账户）。
export async function getFinancialSnapshot(): Promise<FinancialSnapshot> {
  const supabase = await createClient();

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const [{ data: profile }, { data: liabilities }, { data: goals }, { data: recentExpenses }] =
    await Promise.all([
      supabase.from("financial_profile").select("*").maybeSingle(),
      supabase.from("liabilities").select("*"),
      supabase.from("savings_goals").select("*").eq("archived", false),
      supabase
        .from("transactions")
        .select("amount")
        .eq("type", "expense")
        .gte("occurred_on", threeMonthsAgo.toISOString().slice(0, 10)),
    ]);

  const emergencyFundGoal =
    (goals ?? []).find((g) => g.name.trim() === EMERGENCY_FUND_GOAL_NAME) ?? null;

  const totalLiabilitiesBalance = (liabilities ?? []).reduce(
    (sum, l) => sum + Number(l.balance),
    0,
  );

  const trackedExpenseTotal = (recentExpenses ?? []).reduce((sum, t) => sum + Number(t.amount), 0);
  const trackedMonthlyAverage =
    recentExpenses && recentExpenses.length > 0 ? trackedExpenseTotal / 3 : 0;

  const monthlyIncome = Number(profile?.monthly_income ?? 0);
  const monthlyExpense =
    profile?.monthly_expense_override != null
      ? Number(profile.monthly_expense_override)
      : trackedMonthlyAverage;

  return {
    profile: profile ?? null,
    hasProfile: monthlyIncome > 0,
    monthlyIncome,
    monthlyExpense,
    trackedMonthlyAverage,
    existingMonthlyDebt: Number(profile?.existing_monthly_debt ?? 0),
    targetCarPrice: profile?.target_car_price != null ? Number(profile.target_car_price) : null,
    spendingStyle: (profile?.spending_style ?? null) as SpendingStyle | null,
    liabilities: liabilities ?? [],
    totalLiabilitiesBalance,
    emergencyFundGoal,
    emergencyFund: computeEmergencyFundStatus(
      monthlyExpense,
      emergencyFundGoal ? Number(emergencyFundGoal.current_amount) : 0,
    ),
  };
}
