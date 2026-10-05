"use client";

import { fieldClass, pinkButton } from "@/components/mobile/ui";

/** 折叠的「修改」区：改名称、直接改余额。银行账户、投资、负债共用。 */
export function EditAccount({
  action,
  name,
  balance,
  balanceLabel,
}: {
  action: (formData: FormData) => void;
  name: string;
  balance: number;
  balanceLabel: string;
}) {
  return (
    <details className="mt-3 rounded-3xl border border-white/[0.07] bg-[#1c1f28] p-4">
      <summary className="cursor-pointer list-none text-center text-[15px] font-semibold text-[#f0a3b3]">
        ✏️ 修改名称 / 金额
      </summary>
      <form action={action} className="mt-4 flex flex-col gap-3">
        <label className="text-xs text-white/45">
          名称
          <input name="name" required defaultValue={name} className={`${fieldClass} mt-1`} />
        </label>
        <label className="text-xs text-white/45">
          {balanceLabel}
          <input
            name="balance"
            required
            inputMode="decimal"
            defaultValue={balance.toFixed(2)}
            className={`${fieldClass} mt-1`}
          />
        </label>
        <button type="submit" className={pinkButton}>
          保存
        </button>
      </form>
    </details>
  );
}
