import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { addLiabilityEntry, deleteMobileAccount, updateMobileAccount } from "@/lib/actions/mobile";
import { LIABILITY_EMOJI, dayHeading, monthRange, rm, todayISO } from "@/lib/mobile";
import { BackHeader, Panel, SectionLabel, fieldClass } from "@/components/mobile/ui";
import { EditAccount } from "@/components/mobile/EditAccount";
import { DeleteButton } from "@/components/mobile/DeleteButton";

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { start, end, month } = monthRange();

  const [{ data: debt }, { data: entries }] = await Promise.all([
    supabase.from("liabilities").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("liability_entries")
      .select("id, amount, note, occurred_on, created_at")
      .eq("liability_id", id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (!debt) notFound();

  const thisMonth = (entries ?? []).filter((e) => e.occurred_on >= start && e.occurred_on < end);
  const repaid = thisMonth.filter((e) => Number(e.amount) < 0).reduce((s, e) => s - Number(e.amount), 0);
  const added = thisMonth.filter((e) => Number(e.amount) > 0).reduce((s, e) => s + Number(e.amount), 0);

  const add = addLiabilityEntry.bind(null, id);

  return (
    <>
      <BackHeader title={debt.name} href="/accounts" />

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            {LIABILITY_EMOJI[debt.category] ?? "💳"}
          </div>
          <div>
            <p className="text-[13px] text-white/50">目前还欠</p>
            <p className="text-[28px] font-bold tracking-tight text-rose-400">{rm(Number(debt.balance))}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/[0.06]">
          <div className="border-r border-white/[0.06] px-5 py-3">
            <p className="text-[11px] text-emerald-400/80">↘ {month}月已还</p>
            <p className="font-semibold text-emerald-400">-{rm(repaid)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-rose-400/80">↗ {month}月新增</p>
            <p className="font-semibold text-rose-400">+{rm(added)}</p>
          </div>
        </div>
      </Panel>

      <SectionLabel>记一笔变动</SectionLabel>
      <Panel className="p-4">
        <form action={add} className="flex flex-col gap-3">
          <input name="amount" required inputMode="decimal" placeholder="金额 RM" className={fieldClass} />
          <div className="grid grid-cols-2 gap-2.5">
            <input type="date" name="occurred_on" defaultValue={todayISO()} required className={fieldClass} />
            <input name="note" placeholder="备注（选填）" className={fieldClass} />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="submit"
              name="direction"
              value="repay"
              className="rounded-2xl bg-emerald-500/15 py-3 text-sm font-semibold text-emerald-300 active:bg-emerald-500/25"
            >
              ↘ 还款
            </button>
            <button
              type="submit"
              name="direction"
              value="borrow"
              className="rounded-2xl bg-rose-500/15 py-3 text-sm font-semibold text-rose-300 active:bg-rose-500/25"
            >
              ↗ 多欠了
            </button>
          </div>
        </form>
      </Panel>

      <EditAccount
        action={updateMobileAccount.bind(null, "liability", id)}
        name={debt.name}
        balance={Number(debt.balance)}
        balanceLabel="目前欠款 RM"
      />

      <SectionLabel>变动记录</SectionLabel>
      {(entries ?? []).length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">还没有记录。还款或多欠时在上面记一笔。</p>
      ) : (
        <Panel className="divide-y divide-white/[0.06] px-4">
          {(entries ?? []).map((e) => {
            const amount = Number(e.amount);
            const { label, weekday } = dayHeading(e.occurred_on);
            return (
              <div key={e.id} className="flex items-center gap-3 py-3">
                <span className="text-2xl">{amount < 0 ? "✅" : "🧾"}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.note || (amount < 0 ? "还款" : "新增欠款")}</p>
                  <p className="text-[12px] text-white/40">
                    {label} {weekday}
                  </p>
                </div>
                <span className={`font-semibold ${amount < 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {amount < 0 ? "-" : "+"}
                  {rm(Math.abs(amount))}
                </span>
              </div>
            );
          })}
        </Panel>
      )}

      <DeleteButton
        action={deleteMobileAccount.bind(null, "liability", id)}
        label="删除这笔负债"
        confirmText={`确定删除「${debt.name}」？它的变动记录也会一起删除，无法恢复。`}
      />
    </>
  );
}
