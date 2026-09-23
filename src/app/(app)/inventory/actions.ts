"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type InventoryItem = {
  id: string;
  name: string;
  unit: string;
  needed: number;
  remaining: number;
};

export async function addInventoryItem(): Promise<InventoryItem | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_items")
    .insert({ restaurant_id: restaurant.id, name: "", unit: "kg", needed: 0, remaining: 0 })
    .select("id, name, unit, needed, remaining")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "inventory_item_added",
    detail: "",
  });

  revalidatePath("/inventory");
  return data;
}

export async function updateInventoryItem(
  id: string,
  patch: Partial<Pick<InventoryItem, "name" | "unit" | "needed" | "remaining">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/inventory");
}

export async function removeInventoryItem(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "inventory_item_removed",
    detail: name,
  });

  revalidatePath("/inventory");
}
