import type { ReactNode } from "react";
import { BottomNav } from "@/components/mobile/BottomNav";
import { AppLock } from "@/components/mobile/AppLock";

// 手机专用外壳：深色、最宽 480px、底部悬浮导航、密码锁。
// 登录检查在 proxy（lib/supabase/middleware.ts）里做过了，这里不再重复查一次，换页会快一点；
// 数据本身还有数据库的 RLS 保护。
export default function MobileLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`html,body{background:#11131a;color-scheme:dark}`}</style>
      <AppLock>
        <div
          className="mx-auto min-h-dvh w-full max-w-[480px] bg-[#11131a] px-4 text-white"
          style={{
            paddingTop: "max(env(safe-area-inset-top), 16px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 110px)",
          }}
        >
          {children}
        </div>
        <BottomNav />
      </AppLock>
    </>
  );
}
