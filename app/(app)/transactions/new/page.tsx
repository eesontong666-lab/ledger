import { createClient } from "@/lib/supabase/server";
import { createTransaction } from "@/lib/actions/transactions";
import { TransactionForm } from "@/components/TransactionForm";
import { Card } from "@/components/ui/Card";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("sort_order");

  return (
    <div className="max-w-md">
      <h1 className="mb-4 text-lg font-semibold">新增记录</h1>
      <Card>
        <TransactionForm categories={categories ?? []} action={createTransaction} />
      </Card>
    </div>
  );
}
