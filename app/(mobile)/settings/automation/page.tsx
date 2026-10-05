import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { setCaptureDefaultAccount } from "@/lib/actions/mobile";
import { BackHeader, Panel, SectionLabel, fieldClass, pinkButton, primaryButton } from "@/components/mobile/ui";
import { LangProvider, LangToggle, T } from "@/components/mobile/lang";
import { TokenPanel } from "@/components/mobile/TokenPanel";
import { ShortcutGuide } from "@/components/mobile/ShortcutGuide";
import { ParserTester } from "@/components/mobile/ParserTester";

const list = "list-decimal space-y-2 pl-5 text-[14px] leading-relaxed text-white/70";

export default async function AutomationPage() {
  const supabase = await createClient();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;

  // 已签名的快捷指令文件（public/Ledger Screenshot.shortcut）。里面没有网址也没有密钥，
  // 添加时 iPhone 会问一次“专属链接”，所以同一份文件谁都能用。
  // 用普通 https 链接下载再点开；shortcuts://import-shortcut 在 iPhone 上会报 import failed。
  // 文件名就是添加后的快捷指令名字。
  const fileUrl = `${origin}/${encodeURIComponent("Ledger Screenshot.shortcut")}`;

  const [{ data: token }, { data: assets }] = await Promise.all([
    supabase.from("capture_tokens").select("created_at, last_used_at, default_asset_id").maybeSingle(),
    supabase.from("assets").select("id, name").order("created_at"),
  ]);

  return (
    <LangProvider>
      <BackHeader title={<T zh="截图记账" en="Screenshot Logging" />} href="/settings" right={<LangToggle />} />

      <Panel className="p-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-2xl">📸</div>
          <p className="text-[14px] leading-relaxed text-white/70">
            <T
              zh={
                <>
                  在任何付款成功或收据画面，<b className="text-white">轻点 iPhone 背面两下</b>，
                  自动截图、读取金额和商家，几秒后弹出通知：已记账。只要做下面 3 步。
                </>
              }
              en={
                <>
                  On any payment-success or receipt screen, <b className="text-white">double-tap the back of your iPhone</b>.
                  It takes a screenshot, reads the amount and merchant, and a notification confirms the entry. Just 3 steps below.
                </>
              }
            />
          </p>
        </div>
      </Panel>

      <SectionLabel>
        <T zh="① 生成并复制专属链接" en="① Generate and copy your personal link" />
      </SectionLabel>
      <TokenPanel origin={origin} hasToken={!!token} lastUsedAt={token?.last_used_at ?? null} />

      <SectionLabel>
        <T zh="② 添加快捷指令" en="② Add the shortcut" />
      </SectionLabel>
      <Panel className="p-5">
        <a href={fileUrl} download="Ledger Screenshot.shortcut" className={primaryButton}>
          ⬇︎ <T zh="下载快捷指令" en="Download Shortcut" />
        </a>
        <ol className={`${list} mt-4`}>
          <T
            zh={
              <>
                <li>
                  点上面的按钮，出现询问时点 <b>下载</b>。
                </li>
                <li>
                  点开下载好的文件 <b>Ledger Screenshot</b>（Safari 地址栏的 ↓ 图标，或「文件」App 的「下载」文件夹），会打开「快捷指令」App。
                </li>
                <li>
                  它会问你专属链接：长按输入框 → <b>粘贴</b>（就是 ① 复制的那条 https://… 链接）。
                </li>
                <li>
                  点 <b>添加快捷指令</b>。完成。
                </li>
              </>
            }
            en={
              <>
                <li>
                  Tap the button above. When asked, tap <b>Download</b>.
                </li>
                <li>
                  Open the downloaded file <b>Ledger Screenshot</b> (the ↓ icon in Safari&apos;s address bar, or the <b>Downloads</b> folder in the Files app). The <b>Shortcuts</b> app opens.
                </li>
                <li>
                  It asks for your personal link: long-press the box → <b>Paste</b> (the https://… link you copied in ①).
                </li>
                <li>
                  Tap <b>Add Shortcut</b>. Done.
                </li>
              </>
            }
          />
        </ol>
        <p className="mt-3 text-xs leading-relaxed text-white/40">
          <T
            zh="没有出现下载？用 Safari 打开这个网址再点一次："
            en="No download prompt? Open this address in Safari and try again: "
          />{" "}
          <span className="select-all break-all font-mono text-white/60">{fileUrl}</span>
        </p>
      </Panel>

      <SectionLabel>
        <T zh="③ 设置轻点背面两下" en="③ Turn on Double Tap" />
      </SectionLabel>
      <Panel className="p-5">
        <ol className={list}>
          <T
            zh={
              <>
                <li>
                  打开 iPhone 的 <b>设置 → 辅助功能 → 触控 → 轻点背面</b>。
                </li>
                <li>
                  点 <b>轻点两下</b>，往下滑到「快捷指令」，选 <b>Ledger Screenshot</b>。
                </li>
                <li>
                  打开一个付款成功的画面，敲两下手机背面。第一次会问几次权限，都点 <b>允许</b>（选「始终允许」以后就不再问）。
                </li>
              </>
            }
            en={
              <>
                <li>
                  Open iPhone <b>Settings → Accessibility → Touch → Back Tap</b>.
                </li>
                <li>
                  Tap <b>Double Tap</b>, scroll down to <b>Shortcuts</b>, choose <b>Ledger Screenshot</b>.
                </li>
                <li>
                  Open a payment-success screen and double-tap the back of the phone. The first run asks for permission a few times — tap <b>Allow</b> (choose <b>Always Allow</b> so it stops asking).
                </li>
              </>
            }
          />
        </ol>
      </Panel>

      {token && (
        <>
          <SectionLabel>
            <T zh="截图记到哪个账户" en="Which account to log to" />
          </SectionLabel>
          <Panel className="p-4">
            <form action={setCaptureDefaultAccount} className="flex gap-2">
              <select name="asset_id" defaultValue={token.default_asset_id ?? ""} className={fieldClass}>
                <option value="">— 不指定 / None —</option>
                {(assets ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={`${pinkButton} shrink-0`}>
                <T zh="保存" en="Save" />
              </button>
            </form>
            <p className="mt-2 text-xs text-white/40">
              <T
                zh="选了账户后，每笔截图记账会自动从该账户余额扣除。"
                en="Once an account is chosen, every screenshot entry is deducted from that account's balance."
              />
            </p>
          </Panel>
        </>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer px-1 text-[13px] font-medium text-white/45">
          <T zh="自动添加不行？手动一步步做" en="Auto-add not working? Build it by hand" />
        </summary>
        <div className="mt-3">
          <ShortcutGuide />
        </div>
      </details>

      <SectionLabel>
        <T zh="测试识别" en="Test the reader" />
      </SectionLabel>
      <ParserTester />
    </LangProvider>
  );
}
