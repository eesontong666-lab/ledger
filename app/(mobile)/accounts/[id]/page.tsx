import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ASSET_EMOJI, categoryEmoji, monthRange, rm } from "@/lib/mobile";
import { BackHeader, Panel, SectionLabel } from "@/components/mobile/ui";
import { HomeFeed, type FeedItem } from "@/components/mobile/HomeFeed";
import { EditAccount } from "@/components/mobile/EditAccount";
import { DeleteButton } from "@/components/mobile/DeleteButton";
import { deleteMobileAccount, updateMobileAccount } from "@/lib/actions/mobile";
import { formatForeign } from "@/lib/fx";

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { start, end, month } = monthRange();

  const [{ data: account }, { data: txs }, { data: categories }] = await Promise.all([
    supabase.from("assets").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("transactions")
      .select("id, type, amount, occurred_on, note, merchant, category_id, source, created_at, original_amount, original_currency")
      .eq("asset_id", id)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("categories").select("id, label_zh, icon"),
  ]);
  if (!account) notFound();

  const catName = new Map((categories ?? []).map((c) => [c.id, c.label_zh]));
  const catIcon = new Map((categories ?? []).map((c) => [c.id, c.icon]));
  const items: FeedItem[] = (txs ?? []).map((t) => {
    const category = catName.get(t.category_id) ?? "其他";
    return {
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      date: t.occurred_on,
      title: t.merchant || t.note || category,
      category,
      emoji: categoryEmoji(category, catIcon.get(t.category_id)),
      account: null,
      fromScreenshot: t.source === "screenshot",
      original:
        t.original_amount && t.original_currency
          ? formatForeign(Number(t.original_amount), t.original_currency)
          : null,
    };
  });

  const thisMonth = items.filter((i) => i.date >= start && i.date < end);
  const out = thisMonth.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
  const inn = thisMonth.filter((i) => i.type === "income").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <BackHeader title={account.name} href="/accounts" />

      <Panel className="overflow-hidden">
        <div className="flex items-center gap-3 px-5 pb-4 pt-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-3xl">
            {ASSET_EMOJI[account.category] ?? "🏦"}
          </div>
          <div>
            <p className="text-[13px] text-white/50">当前余额</p>
            <p className="text-[28px] font-bold tracking-tight">{rm(Number(account.balance))}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-white/[0.06]">
          <div className="border-r border-white/[0.06] px-5 py-3">
            <p className="text-[11px] text-rose-400/80">↘ {month}月支出</p>
            <p className="font-semibold text-rose-400">-{rm(out)}</p>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-emerald-400/80">↗ {month}月收入</p>
            <p className="font-semibold text-emerald-400">+{rm(inn)}</p>
          </div>
        </div>
      </Panel>

      <EditAccount
        action={updateMobileAccount.bind(null, "asset", id)}
        name={account.name}
        balance={Number(account.balance)}
        balanceLabel={account.category === "investment" ? "当前市值 RM" : "当前余额 RM"}
      />

      <SectionLabel>这个账户的进出记录</SectionLabel>
      <HomeFeed items={items} signed emptyText="这个账户还没有记录。记账时选这个账户，或把它设成截图记账的默认账户。" />

      <DeleteButton
        action={deleteMobileAccount.bind(null, "asset", id)}
        label="删除这个账户"
        confirmText={`确定删除「${account.name}」？账户会消失，里面的 ${items.length} 笔记录会保留在首页，但不再属于任何账户。删除后无法恢复。`}
      />
    </>
  );
}
