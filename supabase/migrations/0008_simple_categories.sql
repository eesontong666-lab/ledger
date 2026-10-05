-- 支出分类简化成：衣 食 住 行 + 其他支出
update public.categories set label_zh = '食', sort_order = 11 where type = 'expense' and label_zh = '餐饮';
update public.categories set label_zh = '行', sort_order = 13 where type = 'expense' and label_zh = '交通';
update public.categories set label_zh = '住', sort_order = 12 where type = 'expense' and label_zh = '住房';
update public.categories set label_zh = '衣', sort_order = 10 where type = 'expense' and label_zh = '购物';

-- 水电煤并入「住」，娱乐/医疗/教育/保险并入「其他支出」
with moves as (
  select old.id as old_id, new.id as new_id
  from public.categories old
  join public.categories new
    on new.type = 'expense'
   and new.label_zh = case when old.label_zh = '水电煤' then '住' else '其他支出' end
  where old.type = 'expense' and old.label_zh in ('水电煤', '娱乐', '医疗', '教育', '保险')
), moved_tx as (
  update public.transactions t set category_id = m.new_id from moves m where t.category_id = m.old_id
  returning 1
)
-- 预算有 (user, category, month) 唯一约束：目标分类没有预算时才搬过去，其余的随旧分类删除
update public.budgets b set category_id = m.new_id
from moves m
where b.category_id = m.old_id
  and not exists (
    select 1 from public.budgets x
    where x.user_id = b.user_id and x.month = b.month and x.category_id = m.new_id
  );

delete from public.budgets
where category_id in (select id from public.categories where type = 'expense' and label_zh in ('水电煤', '娱乐', '医疗', '教育', '保险'));

delete from public.categories
where type = 'expense' and label_zh in ('水电煤', '娱乐', '医疗', '教育', '保险');
