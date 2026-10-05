"use client";

import { useEffect, useState } from "react";
import { PASSCODE_LENGTH } from "@/lib/passcodeLock";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/** iPhone 风格的数字密码键盘。输满位数后调用 onComplete；返回 false 会抖动并清空。 */
export function PinPad({
  title,
  subtitle,
  error,
  disabled = false,
  onComplete,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  disabled?: boolean;
  onComplete: (pin: string) => Promise<boolean> | boolean;
}) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (pin.length !== PASSCODE_LENGTH) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      const ok = await onComplete(pin);
      if (cancelled) return;
      setBusy(false);
      if (!ok) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
      setPin("");
    })();
    return () => {
      cancelled = true;
    };
  }, [pin, onComplete]);

  function press(key: string) {
    if (disabled || busy) return;
    if (key === "del") setPin((p) => p.slice(0, -1));
    else if (key && pin.length < PASSCODE_LENGTH) setPin((p) => p + key);
  }

  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mt-1 h-5 text-sm text-white/50">{subtitle}</p>

      <div className={`my-8 flex gap-4 ${shake ? "animate-[pin-shake_0.4s]" : ""}`}>
        {Array.from({ length: PASSCODE_LENGTH }, (_, i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition ${
              i < pin.length ? "border-[#f0a3b3] bg-[#f0a3b3]" : "border-white/40"
            }`}
          />
        ))}
      </div>
      <p className="mb-6 h-5 text-sm text-rose-400">{error}</p>

      <div className="grid grid-cols-3 gap-x-7 gap-y-4">
        {KEYS.map((key, i) =>
          key === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => press(key)}
              aria-label={key === "del" ? "删除" : key}
              className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-[28px] font-medium text-white transition active:scale-95 disabled:opacity-30 ${
                key === "del" ? "text-xl text-white/70" : "bg-white/[0.09] active:bg-white/25"
              }`}
            >
              {key === "del" ? "⌫" : key}
            </button>
          ),
        )}
      </div>
      <style>{`@keyframes pin-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}`}</style>
    </div>
  );
}
