import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryEmoji, monthRange, rm, shiftMonth, todayISO, weekdayHabit, type WeekdayStat } from "@/lib/mobile";
import { Panel, SectionLabel } from "@/components/mobile/ui";

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const { start, end, year, month } = monthRange(m);
  const supabase = await createClient();

  const [{ data: txs }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("type, amount, occurred_on, category_id").gte("occurred_on", start).lt("occurred_on", end),
    supabase.from("categories").select("id, label_zh, type, sort_order, icon").order("sort_order").order("label_zh"),
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
    .map((c) => ({ id: c.id, label: c.label_zh, icon: c.icon, ...(byCategory.get(c.id) ?? { amount: 0, count: 0 }) }))
    .sort((x, y) => y.amount - x.amount);
  const ym = `${year}-${String(month).padStart(2, "0")}`;

  const daysInMonth = new Date(year, month, 0).getDate();
  const daily = Array.from({ length: daysInMonth }, () => 0);
  for (const t of expenses) daily[Number(t.occurred_on.slice(8, 10)) - 1] += Number(t.amount);
  const maxDay = Math.max(1, ...daily);

  // 消费习惯：星期一到星期日，平均每个周几花多少
  const habit = weekdayHabit(expenses, year, month, todayISO());
  const maxAverage = Math.max(...habit.map((h) => h.average));
  const spentDays = habit.filter((h) => h.average > 0);
  const top = spentDays.length ? spentDays.reduce((a, b) => (b.average > a.average ? b : a)) : null;
  // 最少的：在已经过了的那几个周几里比（包括一分钱没花的）
  const passed = habit.filter((h) => h.days > 0);
  const low = top && passed.length > 1 ? passed.reduce((a, b) => (b.average < a.average ? b : a)) : null;
  const avgOf = (days: WeekdayStat[]) => {
    const n = days.reduce((s, h) => s + h.days, 0);
    return n > 0 ? days.reduce((s, h) => s + h.total, 0) / n : 0;
  };
  const weekdayAvg = avgOf(habit.slice(0, 5));
  const weekendAvg = avgOf(habit.slice(5));

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

      <SectionLabel>消费习惯 · 星期几花得多</SectionLabel>
      <Panel className="p-4">
        {!top ? (
          <p className="py-6 text-center text-sm text-white/40">这个月还没有支出，有记录之后这里会显示你星期几花得比较多。</p>
        ) : (
          <>
            <p className="text-[15px] leading-relaxed">
              你在 <b className="text-[#f3c57c]">{top.label}</b> 花得最多，平均每个{top.label}{" "}
              <b className="text-[#f3c57c]">{rm(top.average)}</b>
              {low && low.label !== top.label && (
                <span className="text-white/55">
                  ；最少是 {low.label}，平均 {rm(low.average)}
                </span>
              )}
              。
            </p>

            <div className="mt-4 flex h-32 items-end gap-2">
              {habit.map((h) => {
                const isTop = h.label === top.label;
                return (
                  <div key={h.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className={`text-[10px] ${isTop ? "font-semibold text-[#f3c57c]" : "text-white/45"}`}>
                      {h.average > 0 ? Math.round(h.average) : ""}
                    </span>
                    <div
                      title={`${h.label}：平均 ${rm(h.average)}，这个月共 ${rm(h.total)}（${h.count} 笔，${h.days} 天）`}
                      className={`w-full rounded-t-md ${isTop ? "bg-[#e9a84a]" : h.average > 0 ? "bg-[#d9748a]/70" : "bg-white/[0.06]"}`}
                      style={{ height: `${h.average > 0 ? Math.max(5, (h.average / maxAverage) * 78) : 3}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex gap-2">
              {habit.map((h) => (
                <span
                  key={h.label}
                  className={`flex-1 text-center text-[11px] ${h.label === top.label ? "font-semibold text-[#f3c57c]" : "text-white/45"}`}
                >
                  {h.label.replace("周", "")}
                </span>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] text-white/40">周一到周五 · 平均每天</p>
                <p className="font-semibold">{rm(weekdayAvg)}</p>
              </div>
              <div className="rounded-xl bg-white/[0.04] px-3 py-2">
                <p className="text-[11px] text-white/40">周六周日 · 平均每天</p>
                <p className="font-semibold">{rm(weekendAvg)}</p>
              </div>
            </div>

            <div className="mt-3 divide-y divide-white/[0.06] text-[13px]">
              {habit.map((h) => (
                <div key={h.label} className="flex items-center justify-between py-1.5">
                  <span className={h.label === top.label ? "font-semibold text-[#f3c57c]" : "text-white/70"}>{h.label}</span>
                  <span className="text-white/45">
                    {h.count} 笔 · 共 {rm(h.total)} · 平均 <b className="text-white/85">{rm(h.average)}</b>
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-white/35">
              平均 = 这个月那一天的总支出 ÷ 已经过了几个那一天。柱子上的数字是平均（RM）。
            </p>
          </>
        )}
      </Panel>

      <SectionLabel>支出分类</SectionLabel>
      <Panel className="divide-y divide-white/[0.06] px-4">
        {ranked.map((r) => {
          const pct = totalExpense > 0 ? Math.round((r.amount / totalExpense) * 100) : 0;
          return (
            <Link key={r.id} href={`/stats/${r.id}?m=${ym}`} className="block py-3 active:opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{categoryEmoji(r.label, r.icon)}</span>
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
