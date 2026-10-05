"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * 左上角的返回键：回到「刚才那一页」（例如从统计的分类明细点进一笔交易，返回就回分类明细）。
 * 直接打开这个网址、没有上一页时，才去 fallback 的固定页面。
 */
export function BackLink({ fallback }: { fallback: string }) {
  const router = useRouter();
  return (
    <Link
      href={fallback}
      aria-label="返回"
      onClick={(e) => {
        if (window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#1c1f28] text-xl text-white/80 active:scale-95"
    >
      ‹
    </Link>
  );
}
