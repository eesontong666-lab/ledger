"use client";

import { useCallback, useState } from "react";
import { changeAppPasscode } from "@/lib/actions/passcode";
import { checkPasscode, lockEnabled, RELOCK_AFTER_MS, setPasscode } from "@/lib/passcodeLock";
import { Panel } from "@/components/mobile/ui";
import { PinPad } from "@/components/mobile/PinPad";

// idle → verify（先确认旧密码）→ new → confirm → idle
type Mode = "idle" | "verify" | "new" | "confirm";

export function PasscodeSettings() {
  const [mode, setMode] = useState<Mode>("idle");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const start = () => {
    setError(null);
    setMessage(null);
    // 这台手机上没存过密码（例如清过浏览器数据）就没法本地确认，直接设新的
    setMode(lockEnabled() ? "verify" : "new");
  };

  const onComplete = useCallback(
    async (pin: string) => {
      if (mode === "verify") {
        if (!(await checkPasscode(pin))) {
          setError("密码不对");
          return false;
        }
        setError(null);
        setMode("new");
        return true;
      }
      if (mode === "new") {
        setDraft(pin);
        setError(null);
        setMode("confirm");
        return true;
      }
      if (pin !== draft) {
        setError("两次输入不一样，请重新设置");
        setMode("new");
        return false;
      }
      const { ok } = await changeAppPasscode(pin);
      if (!ok) {
        setError("保存失败，请再试一次");
        setMode("new");
        return false;
      }
      await setPasscode(pin);
      setMode("idle");
      setMessage("✅ 密码已修改");
      return true;
    },
    [mode, draft],
  );

  if (mode !== "idle") {
    const titles = { verify: "输入当前密码", new: "设置新的 6 位密码", confirm: "再输入一次" };
    return (
      <div className="flex flex-col items-center pt-4">
        <PinPad key={mode} title={titles[mode]} error={error} onComplete={onComplete} />
        <button type="button" onClick={() => setMode("idle")} className="mt-8 text-sm text-white/50">
          取消
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center py-6 text-center">
        <div className="text-7xl">🔒</div>
        <p className="mt-4 text-sm leading-relaxed text-white/55">
          这个 App 只用一个 6 位密码进入。
          <br />
          离开超过 {RELOCK_AFTER_MS / 60000} 分钟再回来，也要再输一次。
        </p>
      </div>

      <Panel>
        <button type="button" onClick={start} className="flex w-full items-center justify-between p-5 text-left">
          <span className="font-semibold">修改密码</span>
          <span className="text-white/40">›</span>
        </button>
      </Panel>
      {message && <p className="mt-4 text-center text-sm text-white/70">{message}</p>}
      <p className="mt-4 px-2 text-xs leading-relaxed text-white/35">
        连续输错 5 次会锁定 15 分钟。密码是这个账本唯一的保护，不要告诉别人。
      </p>
    </>
  );
}
