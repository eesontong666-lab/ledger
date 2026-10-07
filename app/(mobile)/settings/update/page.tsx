import { addUpdaterUrl, getVersionInfo } from "@/lib/version";
import { BackHeader, Panel, SectionLabel, primaryButton } from "@/components/mobile/ui";

function formatDate(iso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Kuala_Lumpur", month: "long", day: "numeric" }).format(new Date(iso));
}

export default async function UpdatePage() {
  const info = await getVersionInfo();
  const installUrl = info.repo && !info.isOriginal ? await addUpdaterUrl(info.repo) : null;
  const runUrl = info.repo ? `https://github.com/${info.repo}/actions/workflows/update.yml` : null;

  const headline =
    info.status === "latest"
      ? { icon: "✅", title: "已经是最新版本", tone: "text-emerald-300" }
      : info.status === "behind"
        ? { icon: "⬆️", title: "有新版本", tone: "text-[#f3c57c]" }
        : { icon: "🔄", title: "还不确定是不是最新", tone: "text-white/80" };

  return (
    <>
      <BackHeader title="版本与更新" href="/settings" />

      <Panel className="p-5 text-center">
        <div className="text-5xl">{headline.icon}</div>
        <p className={`mt-3 text-lg font-bold ${headline.tone}`}>{headline.title}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-left">
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <p className="text-[11px] text-white/40">你的版本</p>
            <p className="font-mono text-sm font-semibold">{info.current ?? "—"}</p>
          </div>
          <div className="rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <p className="text-[11px] text-white/40">最新版本</p>
            <p className="font-mono text-sm font-semibold">
              {info.latest ? info.latest.sha : "查不到"}
              {info.latest?.date && <span className="ml-1.5 font-sans text-[11px] font-normal text-white/40">{formatDate(info.latest.date)}</span>}
            </p>
          </div>
        </div>
      </Panel>

      {!info.repo ? (
        <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-sm leading-relaxed text-white/60">
          这一套是手动部署的，没有连接 GitHub，所以不会自动更新。更新时由部署它的人重新部署一次。
        </p>
      ) : info.isOriginal ? (
        <p className="mt-4 rounded-2xl bg-white/[0.04] p-4 text-sm leading-relaxed text-white/60">
          这就是原始的版本，其他人的副本都是从这里更新的。
        </p>
      ) : (
        <>
          <SectionLabel>自动更新</SectionLabel>
          <Panel className="p-5">
            <p className="text-sm leading-relaxed text-white/70">
              每天凌晨会自动检查一次。有新版本就自动更新，大约 2 分钟后生效，<b className="text-white">你的账本资料不会受影响</b>。
            </p>
            {info.status !== "latest" && runUrl && (
              <>
                <a href={runUrl} target="_blank" rel="noopener" className={`${primaryButton} mt-4`}>
                  不想等，现在就更新 ↗
                </a>
                <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/60">
                  <li>在打开的 GitHub 页面登录。</li>
                  <li>
                    点右边的 <b className="text-white/85">Run workflow</b>，再点绿色的 <b className="text-white/85">Run workflow</b>。
                  </li>
                  <li>等 2–3 分钟，回来这一页重新打开，就会显示已经是最新。</li>
                </ol>
              </>
            )}
          </Panel>

          {installUrl && (
            <details className="mt-4 rounded-3xl border border-white/[0.07] bg-[#1c1f28] p-4">
              <summary className="cursor-pointer list-none text-center text-[13px] font-semibold text-white/55">
                GitHub 上找不到 “Update from original”？
              </summary>
              <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                比较早安装的版本还没有自动更新的功能，要加一次（只做这一次）：
              </p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-white/60">
                <li>点下面的按钮，在 GitHub 登录。</li>
                <li>
                  页面里的内容已经填好了，什么都不用改，直接点绿色的 <b className="text-white/85">Commit changes…</b>，再点一次{" "}
                  <b className="text-white/85">Commit changes</b>。
                </li>
                <li>完成。之后每天会自动更新；想马上更新就回来点上面的「现在就更新」。</li>
              </ol>
              <a
                href={installUrl}
                target="_blank"
                rel="noopener"
                className="mt-3 block rounded-2xl bg-white/[0.06] py-3 text-center text-sm font-semibold text-[#f0a3b3]"
              >
                加上自动更新 ↗
              </a>
            </details>
          )}
        </>
      )}
    </>
  );
}
