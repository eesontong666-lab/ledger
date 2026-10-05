import { CreditCardFinder } from "@/components/CreditCardFinder";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "信用卡推荐 | 财务规划师",
  description: "根据你的消费习惯与需求，推荐适合的马来西亚信用卡",
};

export default function CreditCardsPage() {
  return (
    <div className="dark min-h-dvh bg-[#11131a] text-white">
      <style>{`html,body{background:#11131a;color-scheme:dark}`}</style>
      <SiteHeader />

      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <div>
          <h1 className="text-lg font-semibold">信用卡推荐</h1>
          <p className="mt-1 text-sm text-black/50 dark:text-white/50">
            回答几个简单问题，帮你从马来西亚主要银行的信用卡中，筛选出比较符合你需求的选项。仅供参考，不构成正式财务/信贷建议，实际申请请以银行官网条款为准。
          </p>
        </div>

        <CreditCardFinder />
      </main>
    </div>
  );
}
