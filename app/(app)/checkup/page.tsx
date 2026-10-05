import Link from "next/link";
import { formatMYR, SPENDING_STYLE_LABELS } from "@/lib/constants";
import {
  computeCarAffordability,
  computeAllocationPlan,
  recommendCardDirection,
  assessPropertyReadiness,
} from "@/lib/calculations";
import { getFinancialSnapshot } from "@/lib/financialSnapshot";
import { upsertFinancialProfile } from "@/lib/actions/checkup";
import { Card, CardTitle } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function CheckupPage() {
  const snapshot = await getFinancialSnapshot();
  const {
    profile,
    hasProfile,
    monthlyIncome,
    monthlyExpense,
    trackedMonthlyAverage,
    existingMonthlyDebt,
    targetCarPrice,
    spendingStyle,
    liabilities,
    totalLiabilitiesBalance,
    emergencyFundGoal,
    emergencyFund: emergencyFundStatus,
  } = snapshot;

  // 有负债记录，但完全没填每月还款额：DSR 会被当成 0% 计算，容易误判为"健康"。
  const dsrLikelyIncomplete = totalLiabilitiesBalance > 0 && existingMonthlyDebt <= 0;

  const carAffordability = computeCarAffordability(monthlyIncome, targetCarPrice);
  const allocationPlan = computeAllocationPlan(monthlyIncome, monthlyExpense);
  const cardDirections = recommendCardDirection(spendingStyle);
  const propertyReadiness = assessPropertyReadiness({
    monthlyIncome,
    existingMonthlyDebt,
    emergencyFundOk: emergencyFundStatus.isFunded,
    emergencyFundCurrent: emergencyFundStatus.current,
    emergencyFundTarget: emergencyFundStatus.target,
    monthlyInvestmentAmount: allocationPlan.monthlyInvestment,
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold">财务体检</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          以下均为通用理财经验法则的参考计算，不构成专业投资/信贷/税务建议，具体决策请结合自身情况判断。
        </p>
      </div>

      <Card className="max-w-lg">
        <CardTitle>我的数据</CardTitle>
        <form action={upsertFinancialProfile} className="flex flex-col gap-3">
          <Field label="月收入 (RM)">
            <Input
              type="number"
              name="monthly_income"
              step="0.01"
              min="0"
              defaultValue={profile?.monthly_income ?? ""}
              required
            />
          </Field>
          <Field label={`月均支出 (RM) — 留空则用近3个月记账均值 ${trackedMonthlyAverage > 0 ? `(${formatMYR(trackedMonthlyAverage)})` : ""}`}>
            <Input
              type="number"
              name="monthly_expense_override"
              step="0.01"
              min="0"
              defaultValue={profile?.monthly_expense_override ?? ""}
            />
          </Field>
          <Field label="现有每月分期/还款总额 (RM)">
            <Input
              type="number"
              name="existing_monthly_debt"
              step="0.01"
              min="0"
              defaultValue={profile?.existing_monthly_debt ?? ""}
            />
          </Field>
          {liabilities.length > 0 && (
            <div className="rounded-lg bg-black/5 px-3 py-2 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
              <p>
                参考：你在「资产负债」页面记录的负债共 {formatMYR(totalLiabilitiesBalance)}（{liabilities.length}笔）：
              </p>
              <ul className="mt-1 flex flex-col gap-0.5">
                {liabilities.map((l) => (
                  <li key={l.id} className="flex justify-between">
                    <span>{l.name}</span>
                    <span>{formatMYR(Number(l.balance))}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                资产负债页面只记了这些负债的「结欠余额」，没有存每月还款额。请把这些贷款/卡数每月实际要还的金额自己加总，填进上面那一格，DSR才会准确——不要留空或随便填。
              </p>
            </div>
          )}
          {dsrLikelyIncomplete && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              检测到你在「资产负债」页面记录了 {formatMYR(totalLiabilitiesBalance)} 的负债，但这里的「现有每月分期/还款总额」还是 0。
              下面的 DSR（还款负担比）会按 RM0 计算，可能被高估成"健康"，建议填上你每个月实际要还的贷款/信用卡分期总额，评估才准确。
            </p>
          )}
          <Field label="意向购车价格 (RM，可选)">
            <Input
              type="number"
              name="target_car_price"
              step="0.01"
              min="0"
              defaultValue={profile?.target_car_price ?? ""}
            />
          </Field>
          <Field label="主要消费类型">
            <Select name="spending_style" defaultValue={spendingStyle ?? ""}>
              <option value="">不确定</option>
              {Object.entries(SPENDING_STYLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">保存并计算</Button>
        </form>
      </Card>

      {!hasProfile ? (
        <p className="text-sm text-black/40 dark:text-white/40">填写月收入后即可查看下方测算结果</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardTitle>购车能力测算</CardTitle>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex justify-between">
                  <span>可负担车价上限（月收入 × 12）</span>
                  <span className="font-medium">{formatMYR(carAffordability.maxAffordableCarPrice)}</span>
                </li>
                <li className="flex justify-between">
                  <span>建议头期（车价 × 20%）</span>
                  <span className="font-medium">{formatMYR(carAffordability.downPayment)}</span>
                </li>
                <li className="flex justify-between">
                  <span>每月车贷上限（月收入 × 15%）</span>
                  <span className="font-medium">{formatMYR(carAffordability.monthlyInstallmentLimit)}</span>
                </li>
                <li className="flex justify-between">
                  <span>建议贷款年限</span>
                  <span className="font-medium">≤ {carAffordability.maxLoanYears} 年</span>
                </li>
                {carAffordability.targetCarPrice !== null && (
                  <li className="flex justify-between border-t border-black/10 pt-2 dark:border-white/10">
                    <span>意向车价 {formatMYR(carAffordability.targetCarPrice)}</span>
                    <span className={carAffordability.withinBudget ? "text-emerald-600" : "text-rose-600"}>
                      {carAffordability.withinBudget ? "在预算内" : "超出预算"}
                    </span>
                  </li>
                )}
              </ul>
            </Card>

            <Card>
              <CardTitle>收入分配建议</CardTitle>
              <ul className="flex flex-col gap-2 text-sm">
                <li className="flex justify-between">
                  <span>财务自由目标金额（月收入 × 300）</span>
                  <span className="font-medium">{formatMYR(allocationPlan.fiNumber)}</span>
                </li>
                <li className="flex justify-between">
                  <span>建议每月投资额（月收入 × 20%）</span>
                  <span className="font-medium">{formatMYR(allocationPlan.monthlyInvestment)}</span>
                </li>
                <li className="flex justify-between">
                  <span>生活开销预算上限（月收入 × 50%，含分期）</span>
                  <span className="font-medium">{formatMYR(allocationPlan.livingExpenseBudget)}</span>
                </li>
              </ul>
            </Card>

            <Card>
              <CardTitle>紧急备用金</CardTitle>
              <p className="text-sm">
                目标：月均支出 × 6 = <span className="font-medium">{formatMYR(emergencyFundStatus.target)}</span>
              </p>
              {emergencyFundGoal ? (
                <>
                  <p className="mt-1 text-sm">
                    当前紧急储备金（来自「目标储蓄」）：
                    <span className="font-medium">{formatMYR(emergencyFundStatus.current)}</span>
                  </p>
                  <p className={`mt-2 text-sm ${emergencyFundStatus.isFunded ? "text-emerald-600" : "text-rose-600"}`}>
                    {emergencyFundStatus.isFunded
                      ? "已达标"
                      : `还差 ${formatMYR(emergencyFundStatus.target - emergencyFundStatus.current)}`}
                  </p>
                  <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                    这个「当前」金额直接读取「目标储蓄」里「紧急储备金」目标的存入余额，不是资产负债里所有现金/储蓄类资产的总和。
                    要更新就去{" "}
                    <Link href={`/goals/${emergencyFundGoal.id}`} className="underline">
                      目标储蓄 → 紧急储备金
                    </Link>{" "}
                    存入/取出。
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-black/40 dark:text-white/40">
                  还没有可对照的储备金记录。请先去{" "}
                  <Link href="/goals" className="underline text-emerald-600">
                    目标储蓄
                  </Link>{" "}
                  创建一个名为「紧急储备金」的目标，并存入你实际预留的应急金，这里才会显示达标情况。
                </p>
              )}
            </Card>

            <Card>
              <CardTitle>信用卡方向建议</CardTitle>
              {cardDirections.length > 0 ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {cardDirections.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-black/40 dark:text-white/40">
                  先在上方选择你的主要消费类型
                </p>
              )}
              <p className="mt-2 text-xs text-black/40 dark:text-white/40">
                以上为类型方向参考，不针对具体银行产品，请自行比较各银行的年费/利率/回赠细则。
              </p>
            </Card>
          </div>

          <Card>
            <CardTitle>房产购买可行性评估</CardTitle>
            {dsrLikelyIncomplete && (
              <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                下面的 DSR 检查目前按「每月还款 RM0」计算，但你有 {formatMYR(totalLiabilitiesBalance)} 的负债记录尚未反映在还款额里，
                这一项的"✓"暂时不可靠，请先在上方填写实际每月还款总额。
              </p>
            )}
            <ul className="flex flex-col gap-2 text-sm">
              {propertyReadiness.checklist.map((item) => (
                <li key={item.label} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className={item.passed ? "text-emerald-600" : "text-rose-600"}>
                      {item.passed ? "✓" : "✗"}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  <span className="pl-6 text-xs text-black/40 dark:text-white/40">{item.detail}</span>
                </li>
              ))}
            </ul>
            <p className={`mt-3 text-sm font-medium ${propertyReadiness.ready ? "text-emerald-600" : "text-rose-600"}`}>
              {propertyReadiness.ready ? "现阶段财务状况已具备考虑购房的基础" : "建议先完成上方未达标项目，再考虑购房"}
            </p>
            <p className="mt-2 text-xs text-black/40 dark:text-white/40">
              地点选择原则参考：靠近大学城的物业通常较易招租、现金流较稳定、也相对容易管理，是许多人首次置产的常见方向；实际选址仍需结合当地租金行情、交通与自身资金实地考察，本工具不接入真实楼盘数据。
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
