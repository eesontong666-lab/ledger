"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { passcodeLogin } from "@/lib/actions/passcode";
import { setPasscode } from "@/lib/passcodeLock";
import { PinPad } from "@/components/mobile/PinPad";

// needsSetup：服务器上还没有密码（第一次使用或被重置）→ 先输两次来设置
export function PasscodeLogin({ needsSetup }: { needsSetup: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<"enter" | "new" | "confirm">(needsSetup ? "new" : "enter");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const onComplete = useCallback(
    async (pin: string) => {
      if (step === "new") {
        setDraft(pin);
        setError(null);
        setStep("confirm");
        return true;
      }
      if (step === "confirm" && pin !== draft) {
        setError("两次输入不一样，请重新设置");
        setStep("new");
        return false;
      }

      const result = await passcodeLogin(pin, step === "confirm");
      if (result.status === "ok") {
        // 同一个密码也存一份在本机，离开 App 再回来时用它快速解锁
        await setPasscode(pin).catch(() => {});
        router.replace("/home");
        router.refresh();
        return true;
      }
      if (result.status === "wrong") setError(`密码不对，还可以试 ${result.remaining} 次`);
      else if (result.status === "locked") {
        setWait(result.seconds);
        setError(null);
      } else if (result.status === "unset") {
        setError(null);
        setStep("new");
      } else setError("连接出了问题，请再试一次");
      return false;
    },
    [step, draft, router],
  );

  const minutes = Math.ceil(wait / 60);
  const titles = { enter: "输入密码", new: "设置 6 位密码", confirm: "再输入一次" };

  return (
    <PinPad
      key={step}
      title={titles[step]}
      subtitle={step === "enter" ? "解锁你的账本" : "以后打开 App 只需要这个密码"}
      error={wait > 0 ? `输错太多次，请 ${minutes} 分钟后再试` : error}
      disabled={wait > 0}
      onComplete={onComplete}
    />
  );
}
