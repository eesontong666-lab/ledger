"use client";

import { useState, useTransition } from "react";
import { generateCaptureToken } from "@/lib/actions/mobile";
import { Panel, pinkButton } from "@/components/mobile/ui";
import { CopyField } from "@/components/mobile/CopyField";
import { useLang } from "@/components/mobile/lang";

export function TokenPanel({
  origin,
  hasToken,
  lastUsedAt,
}: {
  /** 这个网站自己的网址，例如 https://xxx.vercel.app */
  origin: string;
  hasToken: boolean;
  lastUsedAt: string | null;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { lang } = useLang();
  const en = lang === "en";

  function generate() {
    const warning = en
      ? "The old link stops working immediately and you will need to add the shortcut again. Continue?"
      : "重新生成后，旧的链接会立刻失效，需要重新添加快捷指令。继续？";
    if (hasToken && !confirm(warning)) return;
    startTransition(async () => {
      const result = await generateCaptureToken();
      setToken(result.token);
    });
  }

  const used = lastUsedAt ? new Date(lastUsedAt).toLocaleString(en ? "en-MY" : "zh-CN") : null;

  return (
    <Panel className="flex flex-col gap-3 p-4">
      {token ? (
        <>
          <CopyField label={en ? "Your personal link — tap Copy" : "你的专属链接，点「复制」"} value={`${origin}/api/capture/${token}`} secret />
          <p className="text-xs leading-relaxed text-amber-200/80">
            {en
              ? "⚠️ Shown only once — copy it now. This link works like a password: anyone who has it can add entries to your ledger."
              : "⚠️ 只显示这一次，现在就复制。这条链接就像密码：拿到的人能往你的账本记账，不要发给别人。"}
          </p>
        </>
      ) : (
        <p className="text-[13px] text-white/55">
          {hasToken
            ? en
              ? `Link already generated · ${used ? `last used ${used}` : "not used yet"}. Lost it? Generate a new one.`
              : `已生成专属链接 · ${used ? `上次使用 ${used}` : "还没用过"}。忘了可以重新生成。`
            : en
              ? "The shortcut sends your screenshots to this link, which leads to your ledger only."
              : "快捷指令会把截图发到这条链接，它只通往你自己的账本。"}
        </p>
      )}

      <button type="button" onClick={generate} disabled={pending} className={pinkButton}>
        🔑{" "}
        {pending
          ? en ? "Generating…" : "生成中…"
          : hasToken
            ? en ? "Generate a new link" : "重新生成链接"
            : en ? "Generate my link" : "生成专属链接"}
      </button>
    </Panel>
  );
}
