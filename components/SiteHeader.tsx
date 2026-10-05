import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/dashboard", label: "总览" },
  { href: "/transactions", label: "收支记账" },
  { href: "/net-worth", label: "资产负债" },
  { href: "/goals", label: "目标储蓄" },
  { href: "/checkup", label: "财务体检" },
  { href: "/credit-cards", label: "信用卡推荐" },
];

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href={user ? "/home" : "/"} className="text-sm font-semibold">
          ‹ 财务规划师
        </Link>
        {user ? (
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="text-xs">
              登出
            </Button>
          </form>
        ) : (
          <Link href="/login" className="text-xs text-emerald-600 hover:underline">
            登录
          </Link>
        )}
      </div>
      {user && (
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2 text-sm">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
