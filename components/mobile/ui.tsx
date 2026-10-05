import Link from "next/link";
import type { ReactNode } from "react";
import { BackLink } from "@/components/mobile/BackLink";

export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-center justify-between pt-2">
      <h1 className="text-[26px] font-bold tracking-tight">{children}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  );
}

export function BackHeader({ title, href, right }: { title: ReactNode; href: string; right?: ReactNode }) {
  return (
    <header className="mb-5 grid grid-cols-[44px_1fr_auto] items-center pt-2">
      <BackLink fallback={href} />
      <h1 className="text-center text-lg font-bold">{title}</h1>
      <div className="flex min-w-11 justify-end">{right}</div>
    </header>
  );
}

export function RoundIcon({ href, children, label }: { href: string; children: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1c1f28] text-xl active:scale-95"
    >
      {children}
    </Link>
  );
}

/** 立体感卡片：底部有一道深色“厚度” */
export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-3xl border border-white/[0.07] bg-[#1c1f28] shadow-[0_5px_0_#0b0c10] ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <span className="text-[13px] font-medium text-white/45">{children}</span>
      {right}
    </div>
  );
}

export function Tile({ href, icon, label, badge }: { href: string; icon: string; label: string; badge?: string }) {
  return (
    <Link
      href={href}
      className="relative flex aspect-[1.05] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-3xl border border-white/[0.07] bg-[#1c1f28] shadow-[0_5px_0_#0b0c10] transition active:translate-y-1 active:shadow-[0_1px_0_#0b0c10]"
    >
      <span className="text-[34px] leading-none drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]">{icon}</span>
      <span className="text-[13px] font-medium text-white/90">{label}</span>
      {badge && (
        <span className="absolute right-[-26px] top-[10px] rotate-45 bg-[#e9a84a] px-7 py-0.5 text-[9px] font-bold text-[#3a2508]">
          {badge}
        </span>
      )}
    </Link>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 pb-6 pt-14 text-center">
      <div className="mb-5 text-[84px] leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]">{icon}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-white/50">{text}</p>
      {action && <div className="mt-6 w-full">{action}</div>}
    </div>
  );
}

export const primaryButton =
  "block w-full rounded-full bg-gradient-to-b from-[#ff8a5c] to-[#e8553a] py-3.5 text-center text-[15px] font-semibold text-white shadow-[0_5px_0_#9c3420] transition active:translate-y-1 active:shadow-[0_1px_0_#9c3420] disabled:opacity-50";

export const pinkButton =
  "inline-flex items-center justify-center gap-2 rounded-2xl bg-[#d9748a] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_0_#8d3a4b] transition active:translate-y-1 active:shadow-[0_1px_0_#8d3a4b]";

export const fieldClass =
  "w-full rounded-2xl border border-white/10 bg-[#11131a] px-4 py-3 text-base text-white placeholder:text-white/30 outline-none focus:border-[#d9748a]";
