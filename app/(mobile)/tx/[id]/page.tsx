import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteMobileTransaction, updateTransactionCategory } from "@/lib/actions/mobile";
import { BackHeader, Panel } from "@/components/mobile/ui";
import { categoryEmoji, dayHeading, rm } from "@/lib/mobile";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (!tx) notFound();

  const [{ data: categories }, { data: asset }] = await Promise.all([
    supabase.from("categories").select("id, label_zh, sort_order").eq("type", tx.type).order("sort_order"),
    tx.asset_id
      ? supabase.from("assets").select("name").eq("id", tx.asset_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const label = (categories ?? []).find((c) => c.id === tx.category_id)?.label_zh ?? "其他";
  const changeCategory = updateTransactionCategory.bind(null, id);
  const { label: day, weekday } = dayHeading(tx.occurred_on);

  async function remove() {
    "use server";
    await deleteMobileTransaction(id);
    redirect("/home");
  }

  const rows: [string, string][] = [
    ["分类", label],
    ["日期", `${day} ${weekday}`],
    ["账户", asset?.name ?? "未指定"],
    ["来源", tx.source === "screenshot" ? "📸 截图自动记账" : "手动记账"],
  ];
  if (tx.note) rows.push(["备注", tx.note]);

  return (
    <>
      <BackHeader title="交易详情" href="/home" />
      <div className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2e3a] text-5xl">
          {categoryEmoji(label)}
        </div>
        <p className="mt-3 text-lg font-semibold">{tx.merchant || tx.note || label}</p>
        <p className={`mt-1 text-4xl font-bold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
          {tx.type === "income" ? "+" : "-"}
          {rm(Number(tx.amount))}
        </p>
      </div>

      <form action={changeCategory} className="mb-4 flex gap-2">
        {(categories ?? []).map((c) => {
          const active = c.id === tx.category_id;
          return (
            <button
              key={c.id}
              type="submit"
              name="category_id"
              value={c.id}
              aria-pressed={active}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border py-2.5 transition active:scale-95 ${
                active ? "border-[#d9748a] bg-[#d9748a]/15" : "border-white/[0.07] bg-[#1c1f28]"
              }`}
            >
              <span className="text-xl">{categoryEmoji(c.label_zh)}</span>
              <span className="text-[11px] text-white/80">{c.label_zh.replace("支出", "").replace("收入", "")}</span>
            </button>
          );
        })}
      </form>

      <Panel className="divide-y divide-white/[0.06] px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-3.5 text-[15px]">
            <span className="text-white/45">{k}</span>
            <span className="text-right">{v}</span>
          </div>
        ))}
      </Panel>

      {tx.raw_text && (
        <details className="mt-4 rounded-2xl border border-white/[0.07] bg-[#1c1f28] px-5 py-3 text-sm">
          <summary className="cursor-pointer text-white/60">截图识别出的原文</summary>
          <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-white/50">
            {tx.raw_text}
          </pre>
        </details>
      )}

      <form action={remove} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-full border border-rose-500/30 bg-rose-500/10 py-3.5 text-[15px] font-semibold text-rose-400 active:bg-rose-500/20"
        >
          删除这笔
        </button>
      </form>
    </>
  );
}
