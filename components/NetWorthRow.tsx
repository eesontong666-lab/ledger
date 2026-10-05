"use client";

import { useState } from "react";
import { formatMYR } from "@/lib/constants";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { Select } from "@/components/ui/Input";

export function NetWorthRow({
  id,
  name,
  category,
  categoryOptions,
  balance,
  updateAction,
  deleteAction,
}: {
  id: string;
  name: string;
  category: string;
  categoryOptions: Record<string, string>;
  balance: number;
  updateAction: (id: string, formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm">
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-xs text-black/50 dark:text-white/50">{categoryOptions[category]}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-medium">{formatMYR(balance)}</span>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-xs text-emerald-600 hover:underline"
          >
            编辑
          </button>
          <form action={deleteAction.bind(null, id)}>
            <button
              type="submit"
              className="text-xs text-black/40 hover:text-rose-600 dark:text-white/40"
            >
              删除
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await updateAction(id, formData);
        setExpanded(false);
      }}
      className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/10"
    >
      <input
        type="text"
        name="name"
        defaultValue={name}
        required
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-sm outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-black/20"
      />
      <Select name="category" defaultValue={category} className="text-sm">
        {Object.entries(categoryOptions).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <MoneyInput
        name="balance"
        defaultValue={balance}
        required
        className="rounded-md border border-black/15 bg-white px-2 py-1 text-right text-sm outline-none focus:border-emerald-600 dark:border-white/15 dark:bg-black/20"
      />
      <div className="flex items-center gap-3">
        <button type="submit" className="text-xs text-emerald-600 hover:underline">
          保存
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-xs text-black/40 hover:underline dark:text-white/40"
        >
          取消
        </button>
      </div>
    </form>
  );
}
