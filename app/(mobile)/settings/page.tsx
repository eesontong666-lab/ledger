import { signOut } from "@/lib/actions/auth";
import { PageTitle, SectionLabel, Tile } from "@/components/mobile/ui";

export default function SettingsPage() {
  return (
    <>
      <PageTitle>设置</PageTitle>

      <SectionLabel>自动化与安全</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <Tile href="/settings/automation" icon="📲" label="截图记账" />
        <Tile href="/settings/automation#guide" icon="⚡" label="快捷指令" />
        <Tile href="/settings/security" icon="🔒" label="密码锁" />
      </div>

      <SectionLabel>资金</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <Tile href="/accounts" icon="🏦" label="账户" />
        <Tile href="/accounts?tab=goals" icon="🎯" label="目标" />
        <Tile href="/settings/split" icon="🔀" label="收入分配" />
        <Tile href="/stats" icon="📊" label="统计" />
        <Tile href="/add" icon="✍️" label="记一笔" />
        <Tile href="/transactions" icon="📒" label="全部明细" />
      </div>

      <SectionLabel>工具</SectionLabel>
      <div className="grid grid-cols-3 gap-3">
        <Tile href="/checkup" icon="🩺" label="财务体检" />
        <Tile href="/credit-cards" icon="💳" label="信用卡推荐" />
        <Tile href="/dashboard" icon="🖥️" label="完整版" />
      </div>

      <form action={signOut} className="mt-8">
        <button
          type="submit"
          className="w-full rounded-full border border-white/10 bg-[#1c1f28] py-3.5 text-[15px] font-semibold text-white/60 active:bg-[#232733]"
        >
          锁定并退出
        </button>
      </form>
    </>
  );
}
