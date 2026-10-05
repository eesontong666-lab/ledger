"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createTransaction(formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    category_id: String(formData.get("category_id")),
    type: String(formData.get("type")) as CategoryType,
    amount: Number(formData.get("amount")),
    occurred_on: String(formData.get("occurred_on")),
    note: (formData.get("note") as string) || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function updateTransaction(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id: String(formData.get("category_id")),
      type: String(formData.get("type")) as CategoryType,
      amount: Number(formData.get("amount")),
      occurred_on: String(formData.get("occurred_on")),
      note: (formData.get("note") as string) || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  redirect("/transactions");
}

export async function deleteTransaction(id: string) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw new Error(error.message);

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
}
