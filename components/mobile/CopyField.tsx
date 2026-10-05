"use client";

import { useState, type ReactNode } from "react";
import { useLang } from "@/components/mobile/lang";

export function CopyField({ label, value, secret = false }: { label: ReactNode; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const { lang } = useLang();

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用时用户可以长按手动复制
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#11131a] p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] text-white/40">{label}</span>
        <button type="button" onClick={copy} className="text-xs font-semibold text-[#f0a3b3]">
          {copied ? (lang === "en" ? "Copied ✓" : "已复制 ✓") : lang === "en" ? "Copy" : "复制"}
        </button>
      </div>
      <p className={`select-all break-all font-mono text-[13px] ${secret ? "text-amber-200" : "text-white/85"}`}>{value}</p>
    </div>
  );
}
