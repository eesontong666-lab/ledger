"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { checkPasscode, cooldownSeconds, lockEnabled, markUnlocked, recentlyUnlocked } from "@/lib/passcodeLock";
import { PinPad } from "@/components/mobile/PinPad";

type State = "checking" | "locked" | "open";

export function AppLock({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    const evaluate = () => setState(lockEnabled() && !recentlyUnlocked() ? "locked" : "open");
    evaluate();

    // 离开 App 时记下时间；超过 1 分钟再回来就重新上锁
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (lockEnabled() && !document.querySelector("[data-app-locked]")) markUnlocked();
      } else {
        evaluate();
      }
    };
    const onPageHide = () => {
      if (lockEnabled() && !document.querySelector("[data-app-locked]")) markUnlocked();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  // 输错太多次时倒计时
  useEffect(() => {
    if (state !== "locked") return;
    const tick = () => setWait(cooldownSeconds());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [state]);

  const onComplete = useCallback(async (pin: string) => {
    const ok = await checkPasscode(pin);
    if (ok) {
      setError(null);
      setState("open");
    } else {
      setError("密码不对");
      setWait(cooldownSeconds());
    }
    return ok;
  }, []);

  return (
    <>
      {children}
      {state !== "open" && (
        <div
          data-app-locked={state === "locked" ? "" : undefined}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#11131a] px-8"
        >
          {state === "locked" && (
            <>
              <div className="mb-6 text-5xl">🔒</div>
              <PinPad
                title="输入密码"
                subtitle="解锁财务规划师"
                error={wait > 0 ? `输错太多次，请 ${wait} 秒后再试` : error}
                disabled={wait > 0}
                onComplete={onComplete}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
