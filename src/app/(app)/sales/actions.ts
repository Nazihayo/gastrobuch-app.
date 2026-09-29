"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type SaveSalesDayState = {
  error?: string;
  savedAt?: number;
};

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const parsed = parseFloat(String(raw ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function portions(formData: FormData): Record<string, number> {
  const raw = formData.get("portions");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

// Deducts linked-ingredient inventory by the CHANGE in portions sold since
// the last save (not the full new count), so editing today's numbers twice
// doesn't double-deduct stock.
async function applyInventoryDeductions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string,
  oldPortions: Record<string, number>,
  newPortions: Record<string, number>
): Promise<void> {
  const recipeIds = new Set([...Object.keys(oldPortions), ...Object.keys(newPortions)]);
  const deltas = new Map<string, number>();
  for (const recipeId of recipeIds) {
    const delta = (newPortions[recipeId] || 0) - (oldPortions[recipeId] || 0);
    if (delta !== 0) deltas.set(recipeId, delta);
  }
  if (deltas.size === 0) return;

  const { data: links } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, inventory_item_id, quantity_per_portion")
    .eq("restaurant_id", restaurantId)
    .in("recipe_id", Array.from(deltas.keys()))
    .not("inventory_item_id", "is", null);

  const deductionByItem = new Map<string, number>();
  for (const link of links ?? []) {
    const delta = deltas.get(link.recipe_id) ?? 0;
    if (!link.inventory_item_id || delta === 0) continue;
    const amount = delta * (link.quantity_per_portion || 0);
    deductionByItem.set(
      link.inventory_item_id,
      (deductionByItem.get(link.inventory_item_id) ?? 0) + amount
    );
  }
  if (deductionByItem.size === 0) return;

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, remaining")
    .in("id", Array.from(deductionByItem.keys()));

  for (const item of items ?? []) {
    const deduction = deductionByItem.get(item.id) ?? 0;
    if (deduction === 0) continue;
    await supabase
      .from("inventory_items")
      .update({ remaining: (item.remaining || 0) - deduction })
      .eq("id", item.id)
      .eq("restaurant_id", restaurantId);
  }
}

export async function saveSalesDay(
  _prevState: SaveSalesDayState,
  formData: FormData
): Promise<SaveSalesDayState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "invalid date" };
  }

  const newPortions = portions(formData);

  const { data: existing } = await supabase
    .from("sales_days")
    .select("portions")
    .eq("restaurant_id", restaurant.id)
    .eq("date", date)
    .maybeSingle();
  const oldPortions = (existing?.portions as Record<string, number> | null) ?? {};

  const payload = {
    restaurant_id: restaurant.id,
    date,
    food: num(formData, "food"),
    drink: num(formData, "drink"),
    delivery: num(formData, "delivery"),
    commission_pct: num(formData, "commissionPct"),
    purchases: num(formData, "purchases"),
    portions: newPortions,
  };

  const { error } = await supabase
    .from("sales_days")
    .upsert(payload, { onConflict: "restaurant_id,date" });

  if (error) {
    return { error: error.message };
  }

  await applyInventoryDeductions(supabase, restaurant.id, oldPortions, newPortions);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: (await supabase.auth.getUser()).data.user!.id,
    action: "sales_day_saved",
    detail: date,
  });

  revalidatePath("/sales");
  revalidatePath("/waste-check");
  revalidatePath("/inventory");
  return { savedAt: Date.now() };
}
