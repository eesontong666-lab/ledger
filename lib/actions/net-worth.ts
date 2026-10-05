"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AssetCategory, LiabilityCategory } from "@/lib/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function parseMoney(value: FormDataEntryValue | null): number {
  return Number(String(value ?? "").replace(/,/g, ""));
}

export async function createAsset(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("assets").insert({
    user_id: user.id,
    name: String(formData.get("name")),
    category: String(formData.get("category")) as AssetCategory,
    balance: parseMoney(formData.get("balance")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}

export async function updateAsset(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("assets")
    .update({
      name: String(formData.get("name")),
      category: String(formData.get("category")) as AssetCategory,
      balance: parseMoney(formData.get("balance")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}

export async function deleteAsset(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("assets").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}

export async function createLiability(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("liabilities").insert({
    user_id: user.id,
    name: String(formData.get("name")),
    category: String(formData.get("category")) as LiabilityCategory,
    balance: parseMoney(formData.get("balance")),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}

export async function updateLiability(id: string, formData: FormData) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("liabilities")
    .update({
      name: String(formData.get("name")),
      category: String(formData.get("category")) as LiabilityCategory,
      balance: parseMoney(formData.get("balance")),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}

export async function deleteLiability(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("liabilities")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/net-worth");
  revalidatePath("/checkup");
}
