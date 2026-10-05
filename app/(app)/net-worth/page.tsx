import { createClient } from "@/lib/supabase/server";
import { formatMYR, ASSET_CATEGORY_LABELS, LIABILITY_CATEGORY_LABELS } from "@/lib/constants";
import { computeNetWorth } from "@/lib/calculations";
import {
  createAsset,
  updateAsset,
  deleteAsset,
  createLiability,
  updateLiability,
  deleteLiability,
} from "@/lib/actions/net-worth";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Input";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { NetWorthRow } from "@/components/NetWorthRow";

export default async function NetWorthPage() {
  const supabase = await createClient();
  const [{ data: assets }, { data: liabilities }] = await Promise.all([
    supabase.from("assets").select("*").order("created_at"),
    supabase.from("liabilities").select("*").order("created_at"),
  ]);

  const { totalAssets, totalLiabilities, netWorth } = computeNetWorth(
    assets ?? [],
    liabilities ?? [],
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold">资产负债总览</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardTitle>总资产</CardTitle>
          <p className="text-xl font-semibold text-emerald-600">{formatMYR(totalAssets)}</p>
        </Card>
        <Card>
          <CardTitle>总负债</CardTitle>
          <p className="text-xl font-semibold text-rose-600">{formatMYR(totalLiabilities)}</p>
        </Card>
        <Card>
          <CardTitle>净资产</CardTitle>
          <p className="text-xl font-semibold">{formatMYR(netWorth)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardTitle>资产</CardTitle>
          <div className="flex flex-col gap-2">
            {(assets ?? []).map((a) => (
              <NetWorthRow
                key={a.id}
                id={a.id}
                name={a.name}
                category={a.category}
                categoryOptions={ASSET_CATEGORY_LABELS}
                balance={Number(a.balance)}
                updateAction={updateAsset}
                deleteAction={deleteAsset}
              />
            ))}
            {(!assets || assets.length === 0) && (
              <p className="text-sm text-black/40 dark:text-white/40">还没有资产记录</p>
            )}
          </div>

          <form action={createAsset} className="mt-4 flex flex-wrap items-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <input
              type="text"
              name="name"
              placeholder="名称，如 Maybank 储蓄"
              required
              className="flex-1 min-w-[10rem] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <Select name="category" defaultValue="cash" className="w-32">
              {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <MoneyInput
              name="balance"
              placeholder="金额 (RM)"
              required
              className="w-32 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <Button type="submit">添加</Button>
          </form>
        </Card>

        <Card>
          <CardTitle>负债</CardTitle>
          <div className="flex flex-col gap-2">
            {(liabilities ?? []).map((l) => (
              <NetWorthRow
                key={l.id}
                id={l.id}
                name={l.name}
                category={l.category}
                categoryOptions={LIABILITY_CATEGORY_LABELS}
                balance={Number(l.balance)}
                updateAction={updateLiability}
                deleteAction={deleteLiability}
              />
            ))}
            {(!liabilities || liabilities.length === 0) && (
              <p className="text-sm text-black/40 dark:text-white/40">还没有负债记录</p>
            )}
          </div>

          <form action={createLiability} className="mt-4 flex flex-wrap items-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
            <input
              type="text"
              name="name"
              placeholder="名称，如车贷"
              required
              className="flex-1 min-w-[10rem] rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <Select name="category" defaultValue="loan" className="w-32">
              {Object.entries(LIABILITY_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <MoneyInput
              name="balance"
              placeholder="金额 (RM)"
              required
              className="w-32 rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            />
            <Button type="submit">添加</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
