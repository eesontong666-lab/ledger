import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { categoryEmoji, monthRange, rm } from "@/lib/mobile";
import { HomeFeed, type FeedItem } from "@/components/mobile/HomeFeed";
import { Panel } from "@/components/mobile/ui";

export default async function HomePage() {
  const supabase = await createClient();
  const { start, end, month } = monthRange();

  const [{ data: txs }, { data: categories }, { data: assets }, { data: monthTx }] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("id, type, amount, occurred_on, note, merchant, category_id, asset_id, source, created_at")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("categories").select("id, label_zh"),
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
    };
  });

  const expense = (monthTx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const income = (monthTx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <>
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
