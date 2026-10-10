import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import SuppliersView from "./SuppliersView";

export default async function SuppliersPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: suppliers }, { data: items }, { data: prices }, { data: restaurantRow }] = await Promise.all([
    supabase
      .from("suppliers")
      .select("id, name, email")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("id, name, unit")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("supplier_prices")
      .select("supplier_id, inventory_item_id, price, reorder_quantity")
      .eq("restaurant_id", restaurant.id),
    supabase.from("restaurants").select("auto_reorder_enabled").eq("id", restaurant.id).single(),
  ]);

  return (
    <SuppliersView
      suppliers={suppliers ?? []}
      items={items ?? []}
      prices={prices ?? []}
      autoReorderEnabled={restaurantRow?.auto_reorder_enabled ?? false}
    />
  );
}
