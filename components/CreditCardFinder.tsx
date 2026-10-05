"use client";

import { useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  matchCreditCards,
  SPENDING_FOCUS_LABELS,
  PRIORITY_LABELS,
  DATA_LAST_VERIFIED,
  type SpendingFocus,
  type Priority,
  type CreditCardAnswers,
  type CreditCardMatch,
} from "@/lib/creditCards";

const FOCUS_OPTIONS = Object.entries(SPENDING_FOCUS_LABELS) as [SpendingFocus, string][];
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS) as [Priority, string][];

type Step = "quiz" | "result";

export function CreditCardFinder() {
  const [step, setStep] = useState<Step>("quiz");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [focus, setFocus] = useState<SpendingFocus[]>([]);
  const [categorySpend, setCategorySpend] = useState("");
  const [priority, setPriority] = useState<Priority[]>([]);
  const [feeTolerant, setFeeTolerant] = useState<boolean | null>(null);
  const [results, setResults] = useState<CreditCardMatch[]>([]);
  const [wasEligible, setWasEligible] = useState(true);

  const needsFeeQuestion = !priority.includes("no_annual_fee");
  const canSubmit =
    Number(monthlyIncome) > 0 &&
    Number(monthlyExpense) > 0 &&
    focus.length > 0 &&
    Number(categorySpend) > 0 &&
    priority.length > 0 &&
    (!needsFeeQuestion || feeTolerant !== null);

  function toggleFocus(value: SpendingFocus) {
    setFocus((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  }

  function togglePriority(value: Priority) {
    setPriority((prev) => {
      const wasIncluded = prev.includes(value);
      if (value === "no_annual_fee" && !wasIncluded) setFeeTolerant(false);
      return wasIncluded ? prev.filter((v) => v !== value) : [...prev, value];
    });
  }

  function handleSubmit() {
    if (!canSubmit) return;
    const answers: CreditCardAnswers = {
      monthlyIncome: Number(monthlyIncome),
      monthlyExpense: Number(monthlyExpense),
      focus,
      categorySpend: Number(categorySpend),
      priority,
      feeTolerant: needsFeeQuestion ? Boolean(feeTolerant) : false,
    };
    const matches = matchCreditCards(answers);
    setResults(matches);
    setWasEligible(matches.length === 0 ? true : matches[0].eligible);
    setStep("result");
  }

  function handleReset() {
    setStep("quiz");
    setResults([]);
  }

  const focusLabel = focus.map((f) => SPENDING_FOCUS_LABELS[f]).join("、");

  if (step === "result") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">为你推荐的信用卡</h2>
          <Button variant="secondary" onClick={handleReset}>
            重新填写
          </Button>
        </div>

        <p className="flex flex-wrap items-center gap-1 rounded-lg bg-black/5 px-3 py-2 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
          <span>✓ 资料已逐张对照银行官网复核，核实于 {DATA_LAST_VERIFIED}。</span>
          <span>银行随时可能调整年费/回扣/门槛，点每张卡下方的「资料来源」可查最新版本。</span>
        </p>

        {!wasEligible && (
          <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            以你填写的月收入，暂时没有完全符合门槛的卡，以下是门槛最低的几张卡供参考，请以银行官网最新要求为准。
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {results.map(({ card, reasons }) => (
            <Card key={card.id} className="flex flex-col gap-3">
              <div>
                <p className="text-xs text-black/50 dark:text-white/50">{card.bank}</p>
                <h3 className="text-sm font-semibold">{card.name}</h3>
                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">{card.headline}</p>
              </div>

              {reasons.length > 0 && (
                <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                  {reasons.map((r) => (
                    <p key={r}>为什么推荐给你：{r}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    ✓ 好处
                  </p>
                  <ul className="flex flex-col gap-1 text-xs text-black/70 dark:text-white/70">
                    {card.pros.map((p) => (
                      <li key={p}>• {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                    ⚠ 要注意的地方
                  </p>
                  <ul className="flex flex-col gap-1 text-xs text-black/70 dark:text-white/70">
                    {card.cons.map((c) => (
                      <li key={c}>• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-black/10 pt-2 text-xs text-black/60 dark:border-white/10 dark:text-white/60">
                <span>年费：{card.annualFee === 0 ? "RM0" : `RM${card.annualFee}`}（{card.feeWaiverNote}）</span>
                <span>最低月收入要求：RM{card.minMonthlyIncome.toLocaleString()}</span>
              </div>

              <a
                href={card.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-emerald-700 underline dark:text-emerald-400"
              >
                资料来源（银行官网/官方条款）→
              </a>
            </Card>
          ))}
        </div>

        <p className="text-xs text-black/40 dark:text-white/40">
          资料整理自银行官网及公开信用卡比较平台，最后核对于{DATA_LAST_VERIFIED}。年费、回扣细则、申请门槛银行可能随时调整，实际以各银行官网公布的条款为准。本工具仅供参考，不构成正式财务/信贷建议。
        </p>
      </div>
    );
  }

  return (
    <Card className="flex max-w-lg flex-col gap-4">
      <CardTitle>先告诉我你的情况</CardTitle>

      <Field label="月收入 (RM)">
        <Input
          type="number"
          min="0"
          step="100"
          value={monthlyIncome}
          onChange={(e) => setMonthlyIncome(e.target.value)}
          placeholder="例如 4500"
        />
      </Field>

      <Field label="月支出 (RM) — 每个月大概花多少，含所有开销">
        <Input
          type="number"
          min="0"
          step="100"
          value={monthlyExpense}
          onChange={(e) => setMonthlyExpense(e.target.value)}
          placeholder="例如 2500"
        />
      </Field>

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-black/70 dark:text-white/70">
          你的消费主要集中在哪里？<span className="text-xs text-black/40 dark:text-white/40">（可多选）</span>
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FOCUS_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleFocus(value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                focus.includes(value)
                  ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              {focus.includes(value) ? "✓ " : ""}
              {label}
            </button>
          ))}
        </div>
      </div>

      {focus.length > 0 && (
        <Field label={`你在「${focusLabel}」上，每月大概花多少 (RM)？— 用来估算实际能拿回多少回扣`}>
          <Input
            type="number"
            min="0"
            step="50"
            value={categorySpend}
            onChange={(e) => setCategorySpend(e.target.value)}
            placeholder="例如 800"
          />
        </Field>
      )}

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-black/70 dark:text-white/70">
          你最看重什么？<span className="text-xs text-black/40 dark:text-white/40">（可多选）</span>
        </span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {PRIORITY_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => togglePriority(value)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                priority.includes(value)
                  ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              {priority.includes(value) ? "✓ " : ""}
              {label}
            </button>
          ))}
        </div>
      </div>

      {needsFeeQuestion && (
        <div className="flex flex-col gap-2 text-sm">
          <span className="text-black/70 dark:text-white/70">
            如果年费能换来更高档次的回报（例如更高回扣/里程/贵宾室），你愿意付吗？
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFeeTolerant(true)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                feeTolerant === true
                  ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              愿意，值得的话可以付
            </button>
            <button
              type="button"
              onClick={() => setFeeTolerant(false)}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                feeTolerant === false
                  ? "border-emerald-600 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              不愿意，尽量免年费
            </button>
          </div>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!canSubmit}>
        查看推荐
      </Button>
    </Card>
  );
}
