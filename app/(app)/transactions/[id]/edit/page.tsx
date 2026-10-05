import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateTransaction } from "@/lib/actions/transactions";
import { TransactionForm } from "@/components/TransactionForm";
import { Card } from "@/components/ui/Card";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: transaction }, { data: categories }] = await Promise.all([
    supabase.from("transactions").select("*").eq("id", id).single(),
    supabase.from("categories").select("*").order("sort_order"),
  ]);

  if (!transaction) notFound();

  const boundAction = updateTransaction.bind(null, id);

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-lg font-semibold">编辑记录</h1>
      <Card>
        <TransactionForm
          categories={categories ?? []}
          transaction={transaction}
          action={boundAction}
        />
      </Card>
    </div>
  );
}
