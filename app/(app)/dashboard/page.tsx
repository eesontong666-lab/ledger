import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMYR, firstOfMonth, monthLabel } from "@/lib/constants";
import { computeNetWorth, sumByType, groupSpendByCategory, computeGoalProgress } from "@/lib/calculations";
import { Card, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Category } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const monthStart = firstOfMonth();
  const monthEnd = new Date(
    new Date(monthStart).getFullYear(),
    new Date(monthStart).getMonth() + 1,
    1,
  )
    .toISOString()
    .slice(0, 10);

  const [
    { data: assets },
    { data: liabilities },
    { data: monthTransactions },
    { data: categories },
    { data: goals },
  ] = await Promise.all([
    supabase.from("assets").select("*"),
    supabase.from("liabilities").select("*"),
    supabase
      .from("transactions")
      .select("*")
      .gte("occurred_on", monthStart)
      .lt("occurred_on", monthEnd),
    supabase.from("categories").select("*"),
    supabase.from("savings_goals").select("*").eq("archived", false),
  ]);

  const { netWorth } = computeNetWorth(assets ?? [], liabilities ?? []);
  const income = sumByType(monthTransactions ?? [], "income");
  const expense = sumByType(monthTransactions ?? [], "expense");
  const categoryMap = new Map<string, Category>((categories ?? []).map((c) => [c.id, c]));
  const spendByCategory = [...groupSpendByCategory(monthTransactions ?? []).entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">总览 · {monthLabel(monthStart)}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>净资产</CardTitle>
          <p className="text-xl font-semibold">{formatMYR(netWorth)}</p>
        </Card>
        <Card>
          <CardTitle>本月收入</CardTitle>
          <p className="text-xl font-semibold text-emerald-600">{formatMYR(income)}</p>
        </Card>
        <Card>
          <CardTitle>本月支出</CardTitle>
          <p className="text-xl font-semibold text-rose-600">{formatMYR(expense)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>本月支出分类 Top 5</CardTitle>
          <div className="flex flex-col gap-2">
            {spendByCategory.map(([categoryId, amount]) => (
              <div key={categoryId} className="flex items-center justify-between text-sm">
                <span>{categoryMap.get(categoryId)?.label_zh ?? "—"}</span>
                <span className="font-medium">{formatMYR(amount)}</span>
              </div>
            ))}
            {spendByCategory.length === 0 && (
              <p className="text-sm text-black/40 dark:text-white/40">本月还没有支出记录</p>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>储蓄目标进度</CardTitle>
          <div className="flex flex-col gap-3">
            {(goals ?? []).slice(0, 4).map((goal) => {
              const progress = computeGoalProgress(goal);
              return (
                <Link key={goal.id} href={`/goals/${goal.id}`} className="block">
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{goal.name}</span>
                    <span className="text-black/60 dark:text-white/60">{progress.percent}%</span>
                  </div>
                  <ProgressBar percent={progress.percent} />
                </Link>
              );
            })}
            {(!goals || goals.length === 0) && (
              <p className="text-sm text-black/40 dark:text-white/40">还没有储蓄目标</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
