import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryEmoji, monthRange, rm, shiftMonth } from "@/lib/mobile";
import { Panel, SectionLabel } from "@/components/mobile/ui";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { start, end, year, month } = monthRange(m);
  const supabase = await createClient();

  const [{ data: txs }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("type, amount, occurred_on, category_id").gte("occurred_on", start).lt("occurred_on", end),
    supabase.from("categories").select("id, label_zh, type, sort_order").order("sort_order"),
  ]);

  const expenses = (txs ?? []).filter((t) => t.type === "expense");
  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const totalIncome = (txs ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  // 每个支出分类都列出来（没花钱的显示 RM0），点进去看该分类的每一笔
  const byCategory = new Map<string, { amount: number; count: number }>();
  for (const t of expenses) {
    const cur = byCategory.get(t.category_id) ?? { amount: 0, count: 0 };
    byCategory.set(t.category_id, { amount: cur.amount + Number(t.amount), count: cur.count + 1 });
  }
  const ranked = (categories ?? [])
    .filter((c) => c.type === "expense")
    .map((c) => ({ id: c.id, label: c.label_zh, ...(byCategory.get(c.id) ?? { amount: 0, count: 0 }) }))
    .sort((x, y) => y.amount - x.amount);
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = Array.from({ length: daysInMonth }, () => 0);
  for (const t of expenses) daily[Number(t.occurred_on.slice(8, 10)) - 1] += Number(t.amount);
  const maxDay = Math.max(1, ...daily);

  return (
    <>
      <header className="mb-4 pt-2">
        <h1 className="text-center text-lg font-bold">收支统计</h1>
      </header>
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-white/10 bg-[#1c1f28] px-2 py-2">
        <Link href={`/stats?m=${shiftMonth(year, month, -1)}`} className="px-4 py-1 text-white/50" aria-label="上个月">
          ‹
        </Link>
        <span className="font-semibold">
          {year}年{month}月
        </span>
        <Link href={`/stats?m=${shiftMonth(year, month, 1)}`} className="px-4 py-1 text-white/50" aria-label="下个月">
          ›
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Panel className="p-4">
          <p className="text-xs text-white/45">支出</p>
          <p className="mt-1 text-xl font-bold text-rose-400">{rm(totalExpense)}</p>
        </Panel>
        <Panel className="p-4">
          <p className="text-xs text-white/45">收入</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{rm(totalIncome)}</p>
        </Panel>
      </div>

      <SectionLabel>每日支出</SectionLabel>
      <Panel className="p-4">
        <div className="flex h-28 items-end gap-[3px]">
          {daily.map((v, i) => (
            <div
              key={i}
              title={`${month}月${i + 1}日 ${rm(v)}`}
              className={`flex-1 rounded-t-[3px] ${v > 0 ? "bg-[#d9748a]" : "bg-white/[0.06]"}`}
              style={{ height: `${v > 0 ? Math.max(6, (v / maxDay) * 100) : 4}%` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/35">
          <span>1日</span>
          <span>{Math.ceil(daysInMonth / 2)}日</span>
          <span>{daysInMonth}日</span>
        </div>
      </Panel>

      <SectionLabel>支出分类</SectionLabel>
      <Panel className="divide-y divide-white/[0.06] px-4">
        {ranked.map((r) => {
          const pct = totalExpense > 0 ? Math.round((r.amount / totalExpense) * 100) : 0;
          return (
            <Link key={r.id} href={`/stats/${r.id}?m=${ym}`} className="block py-3 active:opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryEmoji(r.label)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{r.label}</p>
                  <p className="text-[11px] text-white/40">
                    {r.count} 笔 · {pct}%
                  </p>
                </div>
                <span className={`font-semibold ${r.amount > 0 ? "" : "text-white/35"}`}>{rm(r.amount)}</span>
                <span className="text-white/35">›</span>
              </div>
              <div className="ml-9 mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-[#e9a84a]" style={{ width: `${pct}%` }} />
              </div>
            </Link>
          );
        })}
      </Panel>
    </>
  );
}
