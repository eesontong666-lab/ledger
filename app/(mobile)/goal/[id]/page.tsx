import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addGoalSaving, deleteMobileGoal, linkGoalAccount } from "@/lib/actions/mobile";
import { dayHeading, goalProgress, rm } from "@/lib/mobile";
import { BackHeader, Panel, SectionLabel, fieldClass, pinkButton } from "@/components/mobile/ui";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: goal }, { data: assets }, { data: contributions }] = await Promise.all([
    supabase.from("savings_goals").select("*").eq("id", id).maybeSingle(),
    supabase.from("assets").select("id, name, balance").order("created_at"),
    supabase
      .from("goal_contributions")
      .select("id, amount, occurred_on")
      .eq("goal_id", id)
      .order("occurred_on", { ascending: false })
      .limit(30),
  ]);
  if (!goal) notFound();

  const linked = goal.asset_id ? (assets ?? []).find((a) => a.id === goal.asset_id) : undefined;
  const p = goalProgress(goal, linked ? Number(linked.balance) : null);

  // 环形进度
  const R = 70;
  const C = 2 * Math.PI * R;

  const link = linkGoalAccount.bind(null, id);
  const save = addGoalSaving.bind(null, id);
  const remove = deleteMobileGoal.bind(null, id);

  return (
    <>
      <BackHeader title={goal.name} href="/accounts?tab=goals" />

      <Panel className="flex flex-col items-center px-5 py-6">
        <div className="relative h-[180px] w-[180px]">
          <svg viewBox="0 0 180 180" className="h-full w-full -rotate-90">
            <circle cx="90" cy="90" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="14" />
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={p.done ? "#34d399" : "#e9a84a"}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - p.percent / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[34px] font-bold leading-none">{p.percent}%</span>
            <span className="mt-1 text-xs text-white/45">{p.done ? "目标达成 🎉" : "已完成"}</span>
          </div>
        </div>
        <p className="mt-4 text-[26px] font-bold tracking-tight">{rm(p.saved)}</p>
        <p className="text-sm text-white/45">目标 {rm(p.target)}</p>
      </Panel>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Panel className="p-4">
          <p className="text-xs text-white/45">还差</p>
          <p className="mt-1 text-lg font-bold">{rm(p.remaining)}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs text-white/45">
            {goal.target_date ? `到 ${dayHeading(goal.target_date).label}` : "目标日期"}
          </p>
          <p className="mt-1 text-lg font-bold">
            {p.daysLeft === null ? "未设定" : p.daysLeft > 0 ? `还有 ${p.daysLeft} 天` : "已到期"}
          </p>
        </Panel>
      </div>
      {p.perMonth !== null && (
        <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-center text-sm text-white/70">
          想准时达成，每个月要存大约 <b className="text-[#e9a84a]">{rm(p.perMonth)}</b>
        </p>
      )}

      <SectionLabel>绑定银行账户</SectionLabel>
      <Panel className="p-4">
        <form action={link} className="flex gap-2">
          <select name="asset_id" defaultValue={goal.asset_id ?? ""} className={fieldClass}>
            <option value="">不绑定，手动存入</option>
            {(assets ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}（{rm(Number(a.balance))}）
              </option>
            ))}
          </select>
          <button type="submit" className={`${pinkButton} shrink-0`}>
            保存
          </button>
        </form>
        <p className="mt-2 text-xs leading-relaxed text-white/40">
          {linked ? (
            <>
              进度实时跟着「{linked.name}」的余额走：这个账户进钱，进度就往上；花掉了，进度就往下。{" "}
              <Link href={`/accounts/${linked.id}`} className="text-[#f0a3b3] underline">
                看这个账户的进出
              </Link>
            </>
          ) : (
            "绑定后，进度会实时跟着那个账户的余额走，不用再手动记录存了多少。"
          )}
        </p>
      </Panel>

      {!linked && (
        <>
          <SectionLabel>手动存入</SectionLabel>
          <Panel className="p-4">
            <form action={save} className="flex gap-2">
              <input name="amount" required inputMode="decimal" placeholder="这次存了多少 RM" className={fieldClass} />
              <button type="submit" className={`${pinkButton} shrink-0`}>
                存入
              </button>
            </form>
            {(contributions ?? []).length > 0 && (
              <div className="mt-3 divide-y divide-white/[0.06]">
                {(contributions ?? []).map((c) => (
                  <div key={c.id} className="flex justify-between py-2.5 text-sm">
                    <span className="text-white/50">{dayHeading(c.occurred_on).label}</span>
                    <span className="font-semibold text-emerald-400">+{rm(Number(c.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}

      <form action={remove} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-full border border-rose-500/30 bg-rose-500/10 py-3.5 text-[15px] font-semibold text-rose-400 active:bg-rose-500/20"
        >
          删除这个目标
        </button>
      </form>
    </>
  );
}
