import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeInventoryVariance, type OrderPortionInput, type RecipeLinkInput } from "@/lib/inventoryVariance";
import InventoryVarianceView from "./InventoryVarianceView";

export default async function InventoryVariancePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - 60);
  const sinceIso = since.toISOString();

  const [{ data: items }, { data: countRows }, { data: linkRows }, { data: orderItemRows }] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("id, name, unit")
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("inventory_counts")
      .select("inventory_item_id, remaining, counted_at")
      .eq("restaurant_id", restaurant.id)
      .gte("counted_at", sinceIso),
    supabase
      .from("recipe_ingredients")
      .select("inventory_item_id, quantity_per_portion, recipes(name)")
      .eq("restaurant_id", restaurant.id)
      .not("inventory_item_id", "is", null),
    supabase
      .from("order_items")
      .select("recipe_name, quantity, orders!inner(created_at)")
      .eq("restaurant_id", restaurant.id)
      .gte("orders.created_at", sinceIso),
  ]);

  const countsByItem = new Map<string, { remaining: number; countedAt: string }[]>();
  for (const row of countRows ?? []) {
    const list = countsByItem.get(row.inventory_item_id) ?? [];
    list.push({ remaining: row.remaining, countedAt: row.counted_at });
    countsByItem.set(row.inventory_item_id, list);
  }

  const linksByItem = new Map<string, RecipeLinkInput[]>();
  for (const row of linkRows ?? []) {
    if (!row.inventory_item_id) continue;
    const recipeName = (row.recipes as unknown as { name: string } | null)?.name;
    if (!recipeName) continue;
    const list = linksByItem.get(row.inventory_item_id) ?? [];
    list.push({ recipeName, quantityPerPortion: row.quantity_per_portion });
    linksByItem.set(row.inventory_item_id, list);
  }

  const orderPortions: OrderPortionInput[] = (orderItemRows ?? []).map((row) => ({
    recipeName: row.recipe_name,
    quantity: row.quantity,
    orderedAt: (row.orders as unknown as { created_at: string }).created_at,
  }));

  const findings = computeInventoryVariance(items ?? [], countsByItem, linksByItem, orderPortions);

  return <InventoryVarianceView findings={findings} />;
}
