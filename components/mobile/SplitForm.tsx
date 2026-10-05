"use client";

import { useActionState, useState } from "react";
import { saveIncomeSplit } from "@/lib/actions/mobile";
import { rm, splitIncome } from "@/lib/mobile";
import { Panel, primaryButton } from "@/components/mobile/ui";

type Account = { id: string; name: string; investment: boolean; percent: number };

export function SplitForm({ accounts }: { accounts: Account[] }) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(accounts.map((a) => [a.id, a.percent ? String(a.percent) : ""])),
  );
  const [state, action, pending] = useActionState(saveIncomeSplit, null);

  const sum = Math.round(accounts.reduce((s, a) => s + (Number(values[a.id]) || 0), 0) * 100) / 100;
  const valid = sum === 100 || sum === 0;
  const example = splitIncome(
    1000,
    accounts.map((a) => ({ ...a, percent: Number(values[a.id]) || 0 })),
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <Panel className="divide-y divide-white/[0.06] px-4">
        {accounts.map((a) => (
          <label key={a.id} className="flex items-center gap-3 py-3">
            <span className="text-xl">{a.investment ? "📈" : "🏦"}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
            <input
              name={`pct_${a.id}`}
              inputMode="decimal"
              placeholder="0"
              value={values[a.id]}
              onChange={(e) => setValues((v) => ({ ...v, [a.id]: e.target.value }))}
              className="w-16 rounded-xl border border-white/10 bg-[#11131a] px-2 py-2 text-right text-base font-semibold outline-none focus:border-[#d9748a]"
            />
            <span className="text-white/45">%</span>
          </label>
        ))}
      </Panel>

      <div
        className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold ${
          sum === 100 ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-200"
        }`}
      >
        <span>合计</span>
        <span>
          {sum}%{sum === 100 ? " ✓" : sum === 0 ? "（未启用）" : sum < 100 ? `，还差 ${Math.round((100 - sum) * 100) / 100}%` : `，多了 ${Math.round((sum - 100) * 100) / 100}%`}
        </span>
      </div>

      {sum === 100 && (
        <Panel className="p-4">
          <p className="mb-2 text-xs text-white/45">例如收入 RM1,000 会这样分</p>
          {example.map((p) => (
            <div key={p.id} className="flex justify-between py-1 text-sm">
              <span className="text-white/70">{p.name}</span>
              <span className="font-semibold text-emerald-400">+{rm(p.amount)}</span>
            </div>
          ))}
        </Panel>
      )}

      {state && <p className={`text-center text-sm ${state.ok ? "text-emerald-300" : "text-rose-400"}`}>{state.message}</p>}

      <button type="submit" disabled={pending || !valid} className={primaryButton}>
        {pending ? "保存中…" : "保存比例"}
      </button>
    </form>
  );
}
