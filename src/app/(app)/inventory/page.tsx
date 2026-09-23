import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import InventoryList from "./InventoryList";

export default async function InventoryPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, name, unit, needed, remaining")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return <InventoryList initialItems={items ?? []} />;
}
