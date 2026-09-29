"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Ingredient = {
  id: string;
  name: string;
  cost: number;
  inventoryItemId: string | null;
  quantityPerPortion: number;
};
export type RecipeHeader = {
  id: string;
  name: string;
  price: number;
  deliveryCommissionPct: number;
};

export async function addRecipe(): Promise<RecipeHeader | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .insert({ restaurant_id: restaurant.id, name: "", price: 0, delivery_commission_pct: 30 })
    .select("id, name, price, delivery_commission_pct")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "recipe_added",
    detail: "",
  });

  revalidatePath("/recipes");
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    deliveryCommissionPct: data.delivery_commission_pct,
  };
}

export async function updateRecipe(
  id: string,
  patch: Partial<{ name: string; price: number; deliveryCommissionPct: number }>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.deliveryCommissionPct !== undefined)
    dbPatch.delivery_commission_pct = patch.deliveryCommissionPct;

  await supabase.from("recipes").update(dbPatch).eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/recipes");
}

export async function removeRecipe(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase.from("recipes").delete().eq("id", id).eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "recipe_removed",
    detail: name,
  });

  revalidatePath("/recipes");
}

export async function addIngredient(recipeId: string): Promise<Ingredient | null> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .insert({ restaurant_id: restaurant.id, recipe_id: recipeId, name: "", cost: 0 })
    .select("id, name, cost, inventory_item_id, quantity_per_portion")
    .single();

  if (error || !data) return null;

  revalidatePath("/recipes");
  return {
    id: data.id,
    name: data.name,
    cost: data.cost,
    inventoryItemId: data.inventory_item_id,
    quantityPerPortion: data.quantity_per_portion,
  };
}

export async function updateIngredient(
  id: string,
  patch: Partial<{
    name: string;
    cost: number;
    inventoryItemId: string | null;
    quantityPerPortion: number;
  }>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.cost !== undefined) dbPatch.cost = patch.cost;
  if (patch.inventoryItemId !== undefined) dbPatch.inventory_item_id = patch.inventoryItemId;
  if (patch.quantityPerPortion !== undefined)
    dbPatch.quantity_per_portion = patch.quantityPerPortion;

  await supabase
    .from("recipe_ingredients")
    .update(dbPatch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
}

export async function removeIngredient(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
}
