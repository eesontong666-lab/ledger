"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/home", icon: "🏠", label: "首页" },
  { href: "/accounts", icon: "👛", label: "账户" },
  { href: "/stats", icon: "📊", label: "统计" },
  { href: "/settings", icon: "⚙️", label: "设置" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] px-5"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <div className="flex items-center justify-around rounded-full border border-white/10 bg-[#1a1d26]/85 px-2 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className="flex h-11 w-14 items-center justify-center rounded-full transition active:scale-90"
            >
              <span
                className={`text-[26px] leading-none transition ${
                  active
                    ? "scale-110 drop-shadow-[0_0_10px_rgba(255,140,90,0.55)]"
                    : "opacity-55 grayscale"
                }`}
              >
                {tab.icon}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
