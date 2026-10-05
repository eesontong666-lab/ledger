"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SpendingStyle } from "@/lib/types";

export async function upsertFinancialProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monthlyExpenseOverrideRaw = formData.get("monthly_expense_override") as string;
  const targetCarPriceRaw = formData.get("target_car_price") as string;
  const spendingStyleRaw = formData.get("spending_style") as string;

  const { error } = await supabase.from("financial_profile").upsert(
    {
      user_id: user.id,
      monthly_income: Number(formData.get("monthly_income") || 0),
      monthly_expense_override: monthlyExpenseOverrideRaw
        ? Number(monthlyExpenseOverrideRaw)
        : null,
      existing_monthly_debt: Number(formData.get("existing_monthly_debt") || 0),
      target_car_price: targetCarPriceRaw ? Number(targetCarPriceRaw) : null,
      spending_style: (spendingStyleRaw || null) as SpendingStyle | null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/checkup");
}
