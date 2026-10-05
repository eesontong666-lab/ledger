import type { ReactNode } from "react";

// 密码登录页，跟手机版一致用深色
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark flex min-h-dvh items-center justify-center bg-[#11131a] px-5 text-white">
      <style>{`html,body{background:#11131a;color-scheme:dark}`}</style>
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-gradient-to-br from-[#1f7a5a] via-[#0f4d3a] to-[#072a21] shadow-[0_5px_0_#041a14]">
            <div className="h-7 w-7 rounded-full border-[3px] border-[#9fd6b0]" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
