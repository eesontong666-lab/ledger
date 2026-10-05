import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { categoryEmoji, monthRange, rm } from "@/lib/mobile";
import { BackHeader, Panel, SectionLabel } from "@/components/mobile/ui";
import { HomeFeed, type FeedItem } from "@/components/mobile/HomeFeed";
import { formatForeign } from "@/lib/fx";

// 统计页点某个分类进来：这个月该分类的每一笔消费
export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<{ m?: string }>;
}) {
  const { categoryId } = await params;
  const { m } = await searchParams;
  const { start, end, year, month } = monthRange(m);
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  const supabase = await createClient();

  const [{ data: category }, { data: txs }, { data: assets }, { data: monthExpenses }] = await Promise.all([
    supabase.from("categories").select("id, label_zh, type").eq("id", categoryId).maybeSingle(),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, note, merchant, asset_id, source, created_at, original_amount, original_currency")
      .eq("category_id", categoryId)
      .gte("occurred_on", start)
      .lt("occurred_on", end)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("assets").select("id, name"),
    supabase.from("transactions").select("amount").eq("type", "expense").gte("occurred_on", start).lt("occurred_on", end),
  ]);
  if (!category) notFound();

  const assetName = new Map((assets ?? []).map((a) => [a.id, a.name]));
  const items: FeedItem[] = (txs ?? []).map((t) => ({
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    date: t.occurred_on,
    title: t.merchant || t.note || category.label_zh,
    category: category.label_zh,
    emoji: categoryEmoji(category.label_zh),
    account: t.asset_id ? (assetName.get(t.asset_id) ?? null) : null,
    fromScreenshot: t.source === "screenshot",
      original:
        t.original_amount && t.original_currency
          ? formatForeign(Number(t.original_amount), t.original_currency)
          : null,
  }));

  const total = items.reduce((s, i) => s + i.amount, 0);
  const allExpense = (monthExpenses ?? []).reduce((s, t) => s + Number(t.amount), 0);
  const pct = category.type === "expense" && allExpense > 0 ? Math.round((total / allExpense) * 100) : null;
  const largest = items.reduce<FeedItem | null>((best, i) => (!best || i.amount > best.amount ? i : best), null);

  return (
    <>
      <BackHeader title={`${categoryEmoji(category.label_zh)} ${category.label_zh}`} href={`/stats?m=${ym}`} />

      <Panel className="overflow-hidden">
        <div className="px-5 pb-4 pt-5">
          <p className="text-[13px] text-white/50">
            {year}年{month}月 · {items.length} 笔
          </p>
          <p className={`mt-1 text-[30px] font-bold tracking-tight ${category.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
            {rm(total)}
          </p>
        </div>
        <div className="grid grid-cols-2 border-t border-white/[0.06]">
          <div className="border-r border-white/[0.06] px-5 py-3">
            <p className="text-[11px] text-white/45">占本月支出</p>
            <p className="font-semibold">{pct === null ? "—" : `${pct}%`}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-white/45">最大一笔</p>
            <p className="truncate font-semibold">{largest ? rm(largest.amount) : "—"}</p>
          </div>
        </div>
      </Panel>

      <SectionLabel>这个分类的每一笔</SectionLabel>
      <HomeFeed items={items} emptyText="这个月在这个分类还没有消费。" />
    </>
  );
}
