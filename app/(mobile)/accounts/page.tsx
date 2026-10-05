import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMobileAccount, createMobileGoal } from "@/lib/actions/mobile";
import { ACCOUNT_TINTS, ASSET_EMOJI, LIABILITY_EMOJI, goalProgress, rm } from "@/lib/mobile";
import { EmptyState, Panel, SectionLabel, fieldClass, pinkButton } from "@/components/mobile/ui";

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const showGoals = tab === "goals";
  const supabase = await createClient();

  const [{ data: assets }, { data: liabilities }, { data: goals }] = await Promise.all([
    supabase.from("assets").select("*").order("created_at"),
    supabase.from("liabilities").select("*").order("created_at"),
    supabase.from("savings_goals").select("*").eq("archived", false).order("created_at"),
  ]);

  const investments = (assets ?? []).filter((a) => a.category === "investment");
  const bankAccounts = (assets ?? []).filter((a) => a.category !== "investment");
  const totalAssets = (assets ?? []).reduce((s, a) => s + Number(a.balance), 0);
  const totalDebt = (liabilities ?? []).reduce((s, l) => s + Number(l.balance), 0);

  return (
    <>
      <header className="mb-5 flex items-center justify-between pt-2">
        <div className="flex gap-6">
          {[
            { key: "accounts", label: "账户", href: "/accounts" },
            { key: "goals", label: "目标", href: "/accounts?tab=goals" },
          ].map((t) => {
            const active = (t.key === "goals") === showGoals;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`relative pb-1.5 text-[22px] font-bold ${active ? "text-white" : "text-white/40"}`}
              >
                {t.label}
                {active && <span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-[#d9748a]" />}
              </Link>
            );
          })}
        </div>
      </header>

      {!showGoals ? (
        <>
          <Panel className="overflow-hidden">
            <Link href="/stats" className="block px-5 pb-4 pt-4">
              <p className="text-[13px] text-white/55">👛 净资产 ›</p>
              <p className="mt-1 text-[30px] font-bold tracking-tight">{rm(totalAssets - totalDebt)}</p>
            </Link>
            <div className="grid grid-cols-2 border-t border-white/[0.06]">
              <div className="border-r border-white/[0.06] px-5 py-3">
                <p className="text-[11px] text-emerald-400/80">↗ 资产</p>
                <p className="font-semibold text-emerald-400">{rm(totalAssets)}</p>
              </div>
              <div className="px-5 py-3">
                <p className="text-[11px] text-rose-400/80">↘ 负债</p>
                <p className="font-semibold text-rose-400">{rm(totalDebt)}</p>
              </div>
            </div>
          </Panel>

          {bankAccounts.length === 0 && investments.length === 0 && (
            <p className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-white/40">
              还没有账户，下面添加第一个
            </p>
          )}
          {[
            { label: "银行账户", list: bankAccounts },
            { label: "投资", list: investments },
          ]
            .filter((group) => group.list.length > 0)
            .map((group) => (
              <div key={group.label}>
                <SectionLabel
                  right={
                    <span className="text-[13px] font-semibold text-emerald-400">
                      {rm(group.list.reduce((sum, a) => sum + Number(a.balance), 0))}
                    </span>
                  }
                >
                  {group.label}
                </SectionLabel>
                {/* 钱包叠卡：每张卡往上压一点 */}
                <div className="flex flex-col">
                  {group.list.map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/accounts/${a.id}`}
                      className={`relative flex items-center gap-3 rounded-3xl border bg-gradient-to-br px-4 pb-7 pt-4 active:brightness-125 ${ACCOUNT_TINTS[i % ACCOUNT_TINTS.length]} ${i > 0 ? "-mt-4" : ""}`}
                      style={{ zIndex: i + 1 }}
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-2xl">
                        {ASSET_EMOJI[a.category] ?? "🏦"}
                      </div>
                      <span className="flex-1 truncate text-[16px] font-semibold">{a.name}</span>
                      <span className="text-[17px] font-bold">{rm(Number(a.balance))}</span>
                      <span className="text-white/40">›</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}

          {(liabilities ?? []).length > 0 && (
            <>
              <SectionLabel right={<span className="text-[13px] font-semibold text-rose-400">{rm(totalDebt)}</span>}>
                信用卡 / 负债
              </SectionLabel>
              <div className="flex flex-col">
                {(liabilities ?? []).map((l, i) => (
                  <Link
                    key={l.id}
                    href={`/debts/${l.id}`}
                    className={`relative flex items-center gap-3 rounded-3xl border border-rose-700/40 bg-gradient-to-br from-rose-900/60 to-rose-950/40 px-4 pb-7 pt-4 active:brightness-125 ${i > 0 ? "-mt-4" : ""}`}
                    style={{ zIndex: i + 1 }}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-2xl">
                      {LIABILITY_EMOJI[l.category] ?? "💳"}
                    </div>
                    <span className="flex-1 truncate text-[16px] font-semibold">{l.name}</span>
                    <span className="text-[17px] font-bold text-rose-300">{rm(Number(l.balance))}</span>
                    <span className="text-white/40">›</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <details className="mt-6 rounded-3xl border border-white/[0.07] bg-[#1c1f28] p-4">
            <summary className="cursor-pointer list-none text-center text-[15px] font-semibold text-[#f0a3b3]">
              ＋ 添加账户
            </summary>
            <form action={createMobileAccount} className="mt-4 flex flex-col gap-3">
              <select name="kind" defaultValue="asset" className={fieldClass}>
                <option value="asset">银行账户</option>
                <option value="investment">投资</option>
                <option value="liability">信用卡 / 负债</option>
              </select>
              <input name="name" required placeholder="名称，例如 Daily Expenses、StashAway" className={fieldClass} />
              <input name="balance" inputMode="decimal" placeholder="当前余额 / 市值 RM" className={fieldClass} />
              <button type="submit" className={pinkButton}>
                保存
              </button>
            </form>
          </details>
        </>
      ) : (
        <>
          {(goals ?? []).length === 0 && (
            <EmptyState icon="🎯" title="还没有储蓄目标" text="旅行、买房、紧急备用金……给钱一个去处。" />
          )}

          <div className="flex flex-col gap-3">
            {(goals ?? []).map((g) => {
              const linked = g.asset_id ? (assets ?? []).find((a) => a.id === g.asset_id) : undefined;
              const p = goalProgress(g, linked ? Number(linked.balance) : null);
              return (
                <Link key={g.id} href={`/goal/${g.id}`} className="block active:opacity-70">
                  <Panel className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold">🎯 {g.name}</span>
                      <span className={`shrink-0 text-sm font-semibold ${p.done ? "text-emerald-400" : "text-white/60"}`}>
                        {p.done ? "达成 🎉" : `${p.percent}%`}
                      </span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${p.done ? "bg-emerald-400" : "bg-[#e9a84a]"}`}
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-white/45">
                      <span>
                        {rm(p.saved)} / {rm(p.target)}
                      </span>
                      {linked && (
                        <span className="max-w-[150px] truncate rounded-md border border-[#d9748a]/40 bg-[#d9748a]/10 px-1.5 py-0.5 text-[11px] text-[#f0a3b3]">
                          🔗 {linked.name}
                        </span>
                      )}
                    </div>
                  </Panel>
                </Link>
              );
            })}
          </div>

          <details className="mt-6 rounded-3xl border border-white/[0.07] bg-[#1c1f28] p-4" open={(goals ?? []).length === 0}>
            <summary className="cursor-pointer list-none text-center text-[15px] font-semibold text-[#f0a3b3]">
              ＋ 新建目标
            </summary>
            <form action={createMobileGoal} className="mt-4 flex flex-col gap-3">
              <input name="name" required placeholder="目标名称，例如 胡志明之旅" className={fieldClass} />
              <input name="target_amount" required inputMode="decimal" placeholder="目标金额 RM" className={fieldClass} />
              <label className="text-xs text-white/45">
                目标日期（选填）
                <input type="date" name="target_date" className={`${fieldClass} mt-1`} />
              </label>
              <label className="text-xs text-white/45">
                绑定银行账户（选填）：进度会跟着这个账户的余额走
                <select name="asset_id" defaultValue="" className={`${fieldClass} mt-1`}>
                  <option value="">不绑定，手动存入</option>
                  {(assets ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}（{rm(Number(a.balance))}）
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={pinkButton}>
                保存
              </button>
            </form>
          </details>
        </>
      )}
    </>
  );
}
