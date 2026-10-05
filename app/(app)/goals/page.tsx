import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/constants";
import { computeGoalProgress } from "@/lib/calculations";
import { createGoal } from "@/lib/actions/goals";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function GoalsPage() {
  const supabase = await createClient();
  const { data: goals } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("archived", false)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">目标储蓄</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(goals ?? []).map((goal) => {
          const progress = computeGoalProgress(goal);
          return (
            <Link key={goal.id} href={`/goals/${goal.id}`}>
              <Card className="hover:border-emerald-600/50 transition-colors">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">{goal.name}</span>
                  <span className="text-sm text-black/60 dark:text-white/60">
                    {progress.percent}%
                  </span>
                </div>
                <ProgressBar percent={progress.percent} />
                <p className="mt-2 text-sm text-black/60 dark:text-white/60">
                  {formatMYR(progress.current)} / {formatMYR(progress.target)}
                </p>
                {goal.target_date && (
                  <p className="mt-1 text-xs text-black/40 dark:text-white/40">
                    目标日期：{goal.target_date}
                  </p>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
      {(!goals || goals.length === 0) && (
        <p className="text-sm text-black/40 dark:text-white/40">还没有储蓄目标</p>
      )}

      <Card className="max-w-md">
        <h2 className="mb-3 text-sm font-medium">新建目标</h2>
        <form action={createGoal} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="目标名称，如买房头期款"
            required
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          <input
            type="number"
            name="target_amount"
            step="0.01"
            min="0.01"
            placeholder="目标金额 (RM)"
            required
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          <input
            type="date"
            name="target_date"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          <Button type="submit">创建</Button>
        </form>
      </Card>
    </div>
  );
}
