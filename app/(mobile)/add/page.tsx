import { createClient } from "@/lib/supabase/server";
import { createMobileTransaction } from "@/lib/actions/mobile";
import { BackHeader } from "@/components/mobile/ui";
import { AddForm } from "@/components/mobile/AddForm";
import { categoryEmoji, todayISO } from "@/lib/mobile";

export default async function AddPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: assets }] = await Promise.all([
    supabase.from("categories").select("id, type, label_zh, sort_order, icon").order("sort_order"),
    supabase.from("assets").select("id, name, income_split_percent").order("created_at"),
  ]);

  return (
    <>
      <BackHeader title="记一笔" href="/home" />
      <AddForm
        action={createMobileTransaction}
        today={todayISO()}
        categories={(categories ?? []).map((c) => ({
          id: c.id,
          type: c.type,
          label: c.label_zh,
          emoji: categoryEmoji(c.label_zh, c.icon),
        }))}
        accounts={(assets ?? []).map((a) => ({ id: a.id, name: a.name, percent: Number(a.income_split_percent) }))}
      />
    </>
  );
}
