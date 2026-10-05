"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createGoal(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("savings_goals").insert({
    user_id: user.id,
    name: String(formData.get("name")),
    target_amount: Number(formData.get("target_amount")),
    target_date: (formData.get("target_date") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
}

export async function addContribution(goalId: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("goal_contributions").insert({
    goal_id: goalId,
    user_id: user.id,
    amount: Number(formData.get("amount")),
    occurred_on: new Date().toISOString().slice(0, 10),
    note: (formData.get("note") as string) || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/goals");
  redirect("/goals");
}
