import { createClient } from "@/lib/supabase/server";
import { BackHeader } from "@/components/mobile/ui";
import { SplitForm } from "@/components/mobile/SplitForm";

export default async function IncomeSplitPage() {
  const supabase = await createClient();
  const { data: assets } = await supabase
    .from("assets")
    .select("id, name, category, income_split_percent")
    .order("created_at");

  return (
    <>
      <BackHeader title="收入分配" href="/settings" />
      <p className="mb-4 px-1 text-sm leading-relaxed text-white/55">
        记收入时选「🔀 按比例分配」，这笔钱会照下面的比例自动分进各个账户。全部加起来要刚好 100%。
      </p>
      <SplitForm
        accounts={(assets ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          investment: a.category === "investment",
          percent: Number(a.income_split_percent),
        }))}
      />
    </>
  );
}
