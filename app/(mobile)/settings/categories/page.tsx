import { createClient } from "@/lib/supabase/server";
import { deleteCategory } from "@/lib/actions/mobile";
import { PROTECTED_CATEGORIES, categoryEmoji } from "@/lib/mobile";
import { BackHeader, Panel, SectionLabel } from "@/components/mobile/ui";
import { CategoryForm } from "@/components/mobile/CategoryForm";
import { DeleteButton } from "@/components/mobile/DeleteButton";

export default async function CategoriesPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: used }] = await Promise.all([
    supabase.from("categories").select("id, type, label_zh, icon, sort_order").order("sort_order").order("label_zh"),
    supabase.from("transactions").select("category_id"),
  ]);
  const count = new Map<string, number>();
  for (const t of used ?? []) count.set(t.category_id, (count.get(t.category_id) ?? 0) + 1);

  const groups = [
    { type: "expense", title: "支出分类" },
    { type: "income", title: "收入分类" },
  ] as const;

  return (
    <>
      <BackHeader title="分类" href="/settings" />
      <p className="mb-2 px-1 text-sm leading-relaxed text-white/55">
        自己加的分类会出现在记一笔、统计，以及截图记账拿不准时弹出的选单里。
      </p>

      <SectionLabel>加一个新的分类</SectionLabel>
      <CategoryForm />

      {groups.map((group) => (
        <div key={group.type}>
          <SectionLabel>{group.title}</SectionLabel>
          <Panel className="divide-y divide-white/[0.06] px-4">
            {(categories ?? [])
              .filter((c) => c.type === group.type)
              .map((c) => {
                const n = count.get(c.id) ?? 0;
                const locked = PROTECTED_CATEGORIES.includes(c.label_zh);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <span className="text-2xl">{categoryEmoji(c.label_zh, c.icon)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.label_zh}</p>
                      <p className="text-[11px] text-white/40">{n} 笔记录</p>
                    </div>
                    {locked ? (
                      <span className="text-[11px] text-white/30">内置</span>
                    ) : (
                      <div className="w-20 [&_button]:!py-2 [&_button]:!text-xs [&_form]:!mt-0">
                        <DeleteButton
                          action={deleteCategory.bind(null, c.id)}
                          label="删除"
                          confirmText={
                            n > 0
                              ? `确定删除「${c.label_zh}」？里面的 ${n} 笔记录会移到「其他」。`
                              : `确定删除「${c.label_zh}」？`
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </Panel>
        </div>
      ))}
    </>
  );
}
