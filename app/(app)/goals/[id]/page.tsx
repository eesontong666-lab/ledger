import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/constants";
import { computeGoalProgress } from "@/lib/calculations";
import { addContribution, deleteGoal } from "@/lib/actions/goals";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: goal }, { data: contributions }] = await Promise.all([
    supabase.from("savings_goals").select("*").eq("id", id).single(),
    supabase
      .from("goal_contributions")
      .select("*")
      .eq("goal_id", id)
      .order("occurred_on", { ascending: false }),
  ]);

  if (!goal) notFound();

  const progress = computeGoalProgress(goal);
  const boundAddContribution = addContribution.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{goal.name}</h1>
        <form action={deleteGoal.bind(null, id)}>
          <Button type="submit" variant="danger">
            删除目标
          </Button>
        </form>
      </div>

      <Card>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>{formatMYR(progress.current)}</span>
          <span className="text-black/60 dark:text-white/60">{formatMYR(progress.target)}</span>
        </div>
        <ProgressBar percent={progress.percent} />
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          已完成 {progress.percent}%{progress.complete ? "，已达标！" : ""}
        </p>
      </Card>

      <Card className="max-w-sm">
        <h2 className="mb-3 text-sm font-medium">存入 / 取出</h2>
        <form action={boundAddContribution} className="flex flex-col gap-3">
          <input
            type="number"
            name="amount"
            step="0.01"
            placeholder="金额 (RM，取出请填负数)"
            required
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          <input
            type="text"
            name="note"
            placeholder="备注（可选）"
            className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
          />
          <Button type="submit">提交</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-medium">存取记录</h2>
        <div className="flex flex-col gap-2 text-sm">
          {(contributions ?? []).map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-black/5 pb-2 last:border-0 dark:border-white/5">
              <div>
                <p>{c.occurred_on}</p>
                {c.note && <p className="text-xs text-black/50 dark:text-white/50">{c.note}</p>}
              </div>
              <span className={Number(c.amount) >= 0 ? "text-emerald-600" : "text-rose-600"}>
                {Number(c.amount) >= 0 ? "+" : ""}
                {formatMYR(Number(c.amount))}
              </span>
            </div>
          ))}
          {(!contributions || contributions.length === 0) && (
            <p className="text-black/40 dark:text-white/40">还没有存取记录</p>
          )}
        </div>
      </Card>
    </div>
  );
}
