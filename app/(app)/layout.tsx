import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/SiteHeader";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    // 跟手机版统一用深色：加 .dark 后各组件的 dark: 样式生效
    <div className="dark min-h-dvh bg-[#11131a] text-white">
      <style>{`html,body{background:#11131a;color-scheme:dark}`}</style>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
