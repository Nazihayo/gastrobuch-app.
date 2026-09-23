"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Expense = {
  id: string;
  name: string;
  amount: number;
};

export async function addExpense(): Promise<Expense | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .insert({ restaurant_id: restaurant.id, name: "", amount: 0 })
    .select("id, name, amount")
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
  return data;
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
