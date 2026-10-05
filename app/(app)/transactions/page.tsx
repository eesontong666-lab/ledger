import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMYR } from "@/lib/constants";
import { deleteTransaction } from "@/lib/actions/transactions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Category } from "@/lib/types";

export default async function TransactionsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: categories }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false })
      .limit(200),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  const categoryMap = new Map<string, Category>((categories ?? []).map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">收支记账</h1>
        <Link href="/transactions/new">
          <Button>新增记录</Button>
        </Link>
      </div>

      <Card className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 bg-black/[.02] text-left text-black/60 dark:border-white/10 dark:bg-white/[.03] dark:text-white/60">
            <tr>
              <th className="px-4 py-2 font-medium">日期</th>
              <th className="px-4 py-2 font-medium">分类</th>
              <th className="px-4 py-2 font-medium">备注</th>
              <th className="px-4 py-2 text-right font-medium">金额</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(transactions ?? []).map((t) => {
              const category = categoryMap.get(t.category_id);
              return (
                <tr key={t.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-2 whitespace-nowrap">{t.occurred_on}</td>
                  <td className="px-4 py-2">{category?.label_zh ?? "—"}</td>
                  <td className="px-4 py-2 text-black/60 dark:text-white/60">{t.note ?? ""}</td>
                  <td
                    className={`px-4 py-2 text-right whitespace-nowrap ${
                      t.type === "income" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatMYR(Number(t.amount))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/transactions/${t.id}/edit`}
                        className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                      >
                        编辑
                      </Link>
                      <form action={deleteTransaction.bind(null, t.id)}>
                        <button className="text-rose-500 hover:text-rose-700" type="submit">
                          删除
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/40 dark:text-white/40">
                  还没有记录，点击右上角新增
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
