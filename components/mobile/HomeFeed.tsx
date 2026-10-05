"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { dayHeading, rm } from "@/lib/mobile";

export type FeedItem = {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  title: string;
  category: string;
  emoji: string;
  account: string | null;
  fromScreenshot: boolean;
};

export function HomeFeed({
  items,
  signed = false,
  emptyText = "点右下角 + 记一笔，或在设置里开启截图自动记账",
}: {
  items: FeedItem[];
  /** 支出前面加 “-”（账户明细里用，一眼看出是减还是加） */
  signed?: boolean;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter(
          (i) =>
            i.title.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q) ||
            i.amount.toFixed(2).includes(q) ||
            (i.account ?? "").toLowerCase().includes(q),
        )
      : items;
    const map = new Map<string, FeedItem[]>();
    for (const item of filtered) {
      const list = map.get(item.date) ?? [];
      list.push(item);
      map.set(item.date, list);
    }
    return [...map.entries()];
  }, [items, query]);

  return (
    <>
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-[#1c1f28] px-4 py-3">
        <span className="text-white/40">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索商家、分类或金额"
          className="w-full bg-transparent text-base text-white placeholder:text-white/35 outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} className="text-white/40" aria-label="清除">
            ✕
          </button>
        )}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="text-7xl">🐥</div>
          <p className="mt-4 text-lg font-bold">{query ? "没有找到" : "还没有记录"}</p>
          <p className="mt-1 text-sm text-white/45">
            {query ? "换个关键词试试" : emptyText}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        {groups.map(([date, list]) => {
          const { label, weekday } = dayHeading(date);
          const dayExpense = list.filter((i) => i.type === "expense").reduce((s, i) => s + i.amount, 0);
          return (
            <section key={date}>
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-white/85">{label}</span>
                  <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white/60">{weekday}</span>
                </div>
                {dayExpense > 0 && <span className="text-sm font-semibold text-rose-400">{rm(dayExpense)}</span>}
              </div>
              <div className="flex flex-col gap-2">
                {list.map((item) => (
                  <Link
                    key={item.id}
                    href={`/tx/${item.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[#1c1f28] px-3.5 py-3 active:bg-[#232733]"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2a2e3a] text-2xl">
                      {item.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold">{item.title}</p>
                      <p className="text-[13px] text-white/45">{item.category}</p>
                      {(item.account || item.fromScreenshot) && (
                        <div className="mt-1 flex gap-1.5">
                          {item.account && (
                            <span className="max-w-[140px] truncate rounded-md border border-[#d9748a]/40 bg-[#d9748a]/10 px-1.5 py-0.5 text-[11px] text-[#f0a3b3]">
                              {item.account}
                            </span>
                          )}
                          {item.fromScreenshot && (
                            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-white/60">📸 截图</span>
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-[15px] font-semibold ${
                        item.type === "income" ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {item.type === "income" ? "+" : signed ? "-" : ""}
                      {rm(item.amount)}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
