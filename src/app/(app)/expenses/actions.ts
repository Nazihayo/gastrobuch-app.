"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Expense = {
  id: string;
  name: string;
  amount: number;
  receiptPath: string | null;
};

export async function addExpense(): Promise<Expense | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert({ restaurant_id: restaurant.id, name: "", amount: 0 })
    .select("id, name, amount, receipt_path")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "expense_added",
    detail: "",
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/breakeven");
  return { id: data.id, name: data.name, amount: data.amount, receiptPath: data.receipt_path };
}

export async function updateExpense(
  id: string,
  patch: Partial<Pick<Expense, "name" | "amount">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/breakeven");
}

export async function removeExpense(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "expense_removed",
    detail: name,
  });

  revalidatePath("/expenses");
  revalidatePath("/");
  revalidatePath("/breakeven");
}

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export type UploadReceiptState = { error?: string; path?: string };

export async function uploadReceipt(
  expenseId: string,
  formData: FormData
): Promise<UploadReceiptState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "no_file" };
  }
  if (file.size > MAX_RECEIPT_BYTES) {
    return { error: "too_large" };
  }

  const { data: existing } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", expenseId)
    .eq("restaurant_id", restaurant.id)
    .single();
  if (existing?.receipt_path) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${restaurant.id}/${expenseId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    return { error: uploadError.message };
  }

  await supabase
    .from("expenses")
    .update({ receipt_path: path })
    .eq("id", expenseId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/expenses");
  return { path };
}

export async function removeReceipt(expenseId: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", expenseId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (existing?.receipt_path) {
    await supabase.storage.from("receipts").remove([existing.receipt_path]);
  }

  await supabase
    .from("expenses")
    .update({ receipt_path: null })
    .eq("id", expenseId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/expenses");
}

export async function getReceiptUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 300);
  if (error) return null;
  return data.signedUrl;
}
