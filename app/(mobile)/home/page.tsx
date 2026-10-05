import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CATEGORY_CHOICES, categoryEmoji, dayHeading, monthRange, rm, todayISO, withinLastHours } from "@/lib/mobile";
import { updateTransactionCategory } from "@/lib/actions/mobile";
import { HomeFeed, type FeedItem } from "@/components/mobile/HomeFeed";
import { Panel } from "@/components/mobile/ui";
import { formatForeign } from "@/lib/fx";

export default async function HomePage() {
  const supabase = await createClient();
  const { start, end, month } = monthRange();

  const [{ data: txs }, { data: categories }, { data: assets }, { data: monthTx }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, occurred_on, note, merchant, category_id, asset_id, source, created_at, original_amount, original_currency, needs_review")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("categories").select("id, label_zh, type"),
      supabase.from("assets").select("id, name"),
      supabase.from("transactions").select("type, amount").gte("occurred_on", start).lt("occurred_on", end),
    ]);

  const catName = new Map((categories ?? []).map((c) => [c.id, c.label_zh]));
  const assetName = new Map((assets ?? []).map((a) => [a.id, a.name]));

  const items: FeedItem[] = (txs ?? []).map((t) => {
    const category = catName.get(t.category_id) ?? "其他";
    return {
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.occurred_on,
      title: t.merchant || t.note || category,
      category,
      emoji: categoryEmoji(category),
      account: t.asset_id ? (assetName.get(t.asset_id) ?? null) : null,
      fromScreenshot: t.source === "screenshot",
      original:
        t.original_amount && t.original_currency
          ? formatForeign(Number(t.original_amount), t.original_currency)
          : null,
    };
  });

  const expense = (monthTx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const income = (monthTx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  // 最近 24 小时内记的、但交易日期不是今天的（补记旧截图）：它们排在各自的日期下面，提醒一下免得以为没记到
  const today = todayISO();
  const backfilled = (txs ?? []).filter(
    (t) => t.source === "screenshot" && t.occurred_on !== today && withinLastHours(t.created_at, 24),
  );
  const backfilledDays = [...new Set(backfilled.map((t) => t.occurred_on))].sort();

  // 截图记账时拿不准分类的那些：放在最上面让用户点一下
  const pending = (txs ?? []).filter((t) => t.needs_review).slice(0, 5);
  const choices = CATEGORY_CHOICES.map((c) => ({
    ...c,
    id: (categories ?? []).find((cat) => cat.type === "expense" && cat.label_zh === c.label)?.id,
  })).filter((c): c is typeof c & { id: string } => !!c.id);

  return (
    <>
      {pending.length > 0 && (
        <section className="mb-5 rounded-3xl border border-[#e9a84a]/40 bg-[#e9a84a]/[0.08] p-4">
          <p className="mb-3 text-[13px] font-semibold text-[#f3c57c]">
            🤔 {pending.length} 笔还没分类，点一下告诉我是哪一类
          </p>
          <div className="flex flex-col gap-3">
            {pending.map((t) => (
              <form key={t.id} action={updateTransactionCategory.bind(null, t.id)}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="truncate text-[15px] font-semibold">{t.merchant || "（没读到商家）"}</span>
                  <span className="shrink-0 text-[15px] font-semibold text-rose-400">{rm(Number(t.amount))}</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {choices.map((c) => (
                    <button
                      key={c.id}
                      type="submit"
                      name="category_id"
                      value={c.id}
                      className="flex flex-col items-center gap-0.5 rounded-xl border border-white/10 bg-[#1c1f28] py-2 active:scale-95 active:border-[#d9748a]"
                    >
                      <span className="text-lg leading-none">{categoryEmoji(c.label)}</span>
                      <span className="text-[11px] text-white/80">{c.label.replace("支出", "")}</span>
                    </button>
                  ))}
                </div>
              </form>
            ))}
          </div>
        </section>
      )}

      {backfilled.length > 0 && (
        <p className="mb-4 rounded-2xl border border-sky-400/25 bg-sky-400/[0.07] px-4 py-3 text-[13px] leading-relaxed text-sky-100/85">
          📥 最近补记了 {backfilled.length} 笔较早的交易，按截图上的日期排在{" "}
          <b>{backfilledDays.map((d) => dayHeading(d).label).join("、")}</b> 下面，往下滑就看得到。
        </p>
      )}

      <Panel className="mb-5 overflow-hidden p-0">
        <div className="bg-gradient-to-br from-[#2a1f2a] via-[#1c1f28] to-[#1c1f28] p-5">
          <div className="flex items-center justify-between text-[13px] text-white/50">
            <span>{month}月支出</span>
            <Link href="/stats" className="text-white/40">
              统计 ›
            </Link>
          </div>
          <p className="mt-1 text-[34px] font-bold tracking-tight">{rm(expense)}</p>
        </div>
        <div className="grid grid-cols-2 border-t border-white/[0.06]">
          <div className="border-r border-white/[0.06] px-5 py-3">
            <p className="text-[11px] text-emerald-400/80">↗ 收入</p>
            <p className="text-base font-semibold text-emerald-400">{rm(income)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-white/45">结余</p>
            <p className="text-base font-semibold">{rm(income - expense)}</p>
          </div>
        </div>
      </Panel>

      <HomeFeed items={items} />

      <Link
        href="/add"
        aria-label="记一笔"
        className="fixed z-30 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-b from-[#ff7a4d] to-[#e5482f] text-4xl font-light text-white shadow-[0_5px_0_#9c3420,0_12px_24px_rgba(229,72,47,0.35)] active:translate-y-1"
        style={{
          right: "max(calc((100vw - 480px) / 2 + 20px), 20px)",
          bottom: "calc(env(safe-area-inset-bottom) + 96px)",
        }}
      >
        +
      </Link>
    </>
  );
}
