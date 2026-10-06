"use client";

import { useActionState, useState } from "react";
import { createCategory } from "@/lib/actions/mobile";
import { Panel, fieldClass, pinkButton } from "@/components/mobile/ui";

const SUGGESTED = ["🎮", "💊", "📚", "🐶", "🎁", "✈️", "💄", "🏋️", "📱", "👶", "🍺", "🛡️"];

export function CategoryForm() {
  const [state, action, pending] = useActionState(createCategory, null);
  const [icon, setIcon] = useState("");

  return (
    <Panel className="p-4">
      <form action={action} className="flex flex-col gap-3">
        <div className="grid grid-cols-[1fr_72px] gap-2">
          <input name="label" required maxLength={8} placeholder="名称，例如 娱乐、医疗" className={fieldClass} />
          <input
            name="icon"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="🏷️"
            aria-label="图标（一个表情符号）"
            className={`${fieldClass} text-center text-xl`}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              aria-label={`用 ${emoji} 当图标`}
              className={`h-9 w-9 rounded-xl border text-lg ${
                icon === emoji ? "border-[#d9748a] bg-[#d9748a]/15" : "border-white/10 bg-[#11131a]"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <select name="type" defaultValue="expense" className={fieldClass}>
          <option value="expense">支出</option>
          <option value="income">收入</option>
        </select>
        {state && <p className={`text-sm ${state.ok ? "text-emerald-300" : "text-rose-400"}`}>{state.message}</p>}
        <button type="submit" disabled={pending} className={pinkButton}>
          {pending ? "保存中…" : "加上这个分类"}
        </button>
      </form>
    </Panel>
  );
}
