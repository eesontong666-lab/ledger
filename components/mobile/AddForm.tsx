"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { fieldClass, primaryButton } from "@/components/mobile/ui";
import { SPLIT_CHOICE, rm, splitIncome } from "@/lib/mobile";

type Cat = { id: string; type: "income" | "expense"; label: string; emoji: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={primaryButton}>
      {pending ? "保存中…" : "保存"}
    </button>
  );
}

export function AddForm({
  action,
  categories,
  accounts,
  today,
}: {
  action: (formData: FormData) => void;
  categories: Cat[];
  accounts: { id: string; name: string; percent: number }[];
  today: string;
}) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const visible = categories.filter((c) => c.type === type);
  const [categoryId, setCategoryId] = useState<string>("");
  const selected = visible.find((c) => c.id === categoryId) ?? visible[0];

  const [amount, setAmount] = useState("");
  const [account, setAccount] = useState("");
  const hasSplit = accounts.some((a) => a.percent > 0);
  const splitting = type === "income" && account === SPLIT_CHOICE;
  const preview = splitting ? splitIncome(Number(amount.replace(",", ".")) || 0, accounts) : [];

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="category_id" value={selected?.id ?? ""} />

      <div className="grid grid-cols-2 rounded-full border border-white/10 bg-[#1c1f28] p-1">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setType(t);
              setCategoryId("");
              // 收入默认按比例分配；切回支出时不能留着这个选项
              setAccount(t === "income" && hasSplit ? SPLIT_CHOICE : "");
            }}
            className={`rounded-full py-2 text-sm font-semibold transition ${
              type === t ? "bg-[#d9748a] text-white" : "text-white/50"
            }`}
          >
            {t === "expense" ? "支出" : "收入"}
          </button>
        ))}
      </div>

      <label className="flex items-baseline justify-center gap-2 py-4">
        <span className="text-2xl font-semibold text-white/50">RM</span>
        <input
          name="amount"
          inputMode="decimal"
          required
          autoFocus
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          pattern="[0-9]*[.,]?[0-9]{0,2}"
          className={`w-48 bg-transparent text-center text-5xl font-bold outline-none placeholder:text-white/20 ${
            type === "expense" ? "text-rose-400" : "text-emerald-400"
          }`}
        />
      </label>

      <div className="grid grid-cols-4 gap-2.5">
        {visible.map((c) => {
          const active = c.id === selected?.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl border py-3 transition ${
                active
                  ? "border-[#d9748a] bg-[#d9748a]/15"
                  : "border-white/[0.07] bg-[#1c1f28] shadow-[0_4px_0_#0b0c10]"
              }`}
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-[11px] text-white/80">{c.label}</span>
            </button>
          );
        })}
      </div>

      <input name="merchant" placeholder={type === "expense" ? "商家（选填）" : "来源（选填）"} className={fieldClass} />

      <div className="grid grid-cols-2 gap-2.5">
        <input type="date" name="occurred_on" defaultValue={today} required className={fieldClass} />
        <select name="asset_id" value={account} onChange={(e) => setAccount(e.target.value)} className={fieldClass}>
          <option value="">不指定账户</option>
          {type === "income" && hasSplit && <option value={SPLIT_CHOICE}>🔀 按比例分配</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {splitting && (
        <div className="rounded-2xl border border-white/[0.07] bg-[#1c1f28] p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-white/45">
            <span>这笔收入会这样分进各账户</span>
            <Link href="/settings/split" className="font-semibold text-[#f0a3b3]">
              改比例
            </Link>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {preview.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-11 shrink-0 rounded-md bg-white/10 py-0.5 text-center text-xs font-semibold text-white/70">
                  {p.percent}%
                </span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="font-semibold text-emerald-400">+{rm(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <input name="note" placeholder="备注（选填）" className={fieldClass} />

      <SubmitButton />
    </form>
  );
}
