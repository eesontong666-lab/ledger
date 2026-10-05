"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Category, CategoryType, Transaction } from "@/lib/types";

export function TransactionForm({
  categories,
  transaction,
  action,
}: {
  categories: Category[];
  transaction?: Transaction;
  action: (formData: FormData) => void;
}) {
  const [type, setType] = useState<CategoryType>(transaction?.type ?? "expense");
  const filteredCategories = categories.filter((c) => c.type === type);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="类型">
        <Select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as CategoryType)}
        >
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </Select>
      </Field>
      <Field label="分类">
        <Select name="category_id" defaultValue={transaction?.category_id} required>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label_zh}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="金额 (RM)">
        <Input
          type="number"
          name="amount"
          step="0.01"
          min="0.01"
          defaultValue={transaction?.amount}
          required
        />
      </Field>
      <Field label="日期">
        <Input
          type="date"
          name="occurred_on"
          defaultValue={transaction?.occurred_on ?? new Date().toISOString().slice(0, 10)}
          required
        />
      </Field>
      <Field label="备注（可选）">
        <Input type="text" name="note" defaultValue={transaction?.note ?? ""} />
      </Field>
      <Button type="submit">保存</Button>
    </form>
  );
}
