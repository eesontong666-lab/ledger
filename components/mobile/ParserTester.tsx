"use client";

import { useState } from "react";
import { parseReceipt } from "@/lib/receiptParser";
import { rm } from "@/lib/mobile";
import { formatForeign } from "@/lib/fx";
import { Panel, fieldClass } from "@/components/mobile/ui";
import { useLang } from "@/components/mobile/lang";

const SAMPLE = `Payment Successful
RM 8.00
Paid to
HAU MUAN SANG
01/10/2026 12:31 PM`;

export function ParserTester() {
  const [text, setText] = useState("");
  const { lang } = useLang();
  const en = lang === "en";
  const result = text.trim() ? parseReceipt(text) : null;

  return (
    <Panel className="p-4">
      <p className="mb-3 text-[13px] text-white/50">
        {en
          ? "Paste text from a screenshot to see how it would be read (nothing is saved)."
          : "贴一段截图文字，看看会被识别成什么（不会记账）。"}
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder={SAMPLE}
        className={`${fieldClass} resize-none font-mono text-sm`}
      />
      {result?.amount && result.currency !== "MYR" && (
        <p className="mt-3 text-xs text-sky-200/80">
          {en
            ? `Foreign currency: it will be converted to RM at today's rate when logged.`
            : "外币：实际记账时会按当天汇率换成马币。"}
        </p>
      )}
      {result && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[
            [
              en ? "Amount" : "金额",
              !result.amount
                ? en ? "❌ Not found" : "❌ 没找到"
                : result.currency === "MYR"
                  ? rm(result.amount)
                  : `${formatForeign(result.amount, result.currency)} → RM`,
            ],
            [en ? "Merchant" : "商家", result.merchant ?? "—"],
            [en ? "Category" : "分类", result.categoryLabel],
            [en ? "Date" : "日期", result.occurredOn ?? (en ? "Today" : "今天")],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[0.04] px-3 py-2">
              <p className="text-[11px] text-white/40">{k}</p>
              <p className="truncate font-semibold">{v}</p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
