import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteMobileTransaction, updateTransactionCategory, updateTransactionDetails } from "@/lib/actions/mobile";
import { BackHeader, Panel, fieldClass, pinkButton } from "@/components/mobile/ui";
import { categoryEmoji, dayHeading, rm } from "@/lib/mobile";
import { formatForeign } from "@/lib/fx";
import { identifyMerchant } from "@/lib/brands";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: tx } = await supabase.from("transactions").select("*").eq("id", id).single();
  if (!tx) notFound();

  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from("categories").select("id, label_zh, sort_order, icon").eq("type", tx.type).order("sort_order"),
    supabase.from("assets").select("id, name").order("created_at"),
  ]);

  const current = (categories ?? []).find((c) => c.id === tx.category_id);
  const label = current?.label_zh ?? "其他";
  const asset = (assets ?? []).find((a) => a.id === tx.asset_id);
  const changeCategory = updateTransactionCategory.bind(null, id);
  const saveDetails = updateTransactionDetails.bind(null, id);
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
  if (tx.original_amount && tx.original_currency) {
    const original = Number(tx.original_amount);
    rows.splice(1, 0, [
      "原本的货币",
      `${formatForeign(original, tx.original_currency)}（1 ${tx.original_currency} ≈ RM${(Number(tx.amount) / original).toFixed(4)}）`,
    ]);
  }
  if (tx.note) rows.push(["备注", tx.note]);

  return (
    <>
      <BackHeader title="交易详情" href="/home" />
      <div className="flex flex-col items-center py-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2a2e3a] text-5xl">
          {categoryEmoji(label, current?.icon)}
        </div>
        <p className="mt-3 text-lg font-semibold">{tx.merchant || tx.note || label}</p>
        <p className={`mt-1 text-4xl font-bold ${tx.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
          {tx.type === "income" ? "+" : "-"}
          {rm(Number(tx.amount))}
        </p>
      </div>

      <form action={changeCategory} className="mb-4 grid grid-cols-5 gap-2">
        {(categories ?? []).map((c) => {
          const active = c.id === tx.category_id;
          return (
            <button
              key={c.id}
              type="submit"
              name="category_id"
              value={c.id}
              aria-pressed={active}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl border py-2.5 transition active:scale-95 ${
                active ? "border-[#d9748a] bg-[#d9748a]/15" : "border-white/[0.07] bg-[#1c1f28]"
              }`}
            >
              <span className="text-xl">{categoryEmoji(c.label_zh, c.icon)}</span>
              <span className="max-w-full truncate px-1 text-[11px] text-white/80">{c.label_zh.replace("支出", "").replace("收入", "")}</span>
            </button>
          );
        })}
      </form>
      {tx.merchant && (
        <p className="-mt-2 mb-4 px-1 text-xs leading-relaxed text-white/40">
          {identifyMerchant(tx.merchant)?.askEveryTime
            ? `「${tx.merchant}」什么都卖，所以每次都会问你这笔算哪一类，不会记住上次的选择。`
            : `改分类后会记住「${tx.merchant}」：以后同一个商家自动归到你选的分类，之前的记录也会一起改。`}
        </p>
      )}

      <Panel className="divide-y divide-white/[0.06] px-5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between py-3.5 text-[15px]">
            <span className="text-white/45">{k}</span>
            <span className="text-right">{v}</span>
          </div>
        ))}
      </Panel>

      <form action={saveDetails} className="mt-5 flex flex-col gap-3 rounded-3xl border border-white/[0.07] bg-[#1c1f28] p-4">
        <p className="text-[15px] font-semibold">✏️ 修改这笔</p>
        <label className="text-xs text-white/45">
          金额 RM
          <input
            name="amount"
            required
            inputMode="decimal"
            defaultValue={Number(tx.amount).toFixed(2)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <label className="text-xs text-white/45">
          {tx.type === "income" ? "来源" : "商家"}
          <input name="merchant" defaultValue={tx.merchant ?? ""} placeholder="选填" className={`${fieldClass} mt-1`} />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-xs text-white/45">
            日期
            <input type="date" name="occurred_on" required defaultValue={tx.occurred_on} className={`${fieldClass} mt-1`} />
          </label>
          <label className="text-xs text-white/45">
            账户
            <select name="asset_id" defaultValue={tx.asset_id ?? ""} className={`${fieldClass} mt-1`}>
              <option value="">不记到账户</option>
              {(assets ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="text-xs text-white/45">
          备注
          <input name="note" defaultValue={tx.note ?? ""} placeholder="选填" className={`${fieldClass} mt-1`} />
        </label>
        <button type="submit" className={pinkButton}>
          保存修改
        </button>
        <p className="text-xs leading-relaxed text-white/40">
          改金额或换账户时，账户的余额会自动跟着调整。分类在上面那排按钮改。
        </p>
      </form>

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
