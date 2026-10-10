"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export async function addSupplier(name: string, email: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  if (!name.trim()) return;
  const supabase = await createClient();
  await supabase
    .from("suppliers")
    .insert({ restaurant_id: restaurant.id, name: name.trim(), email: email.trim() });
  revalidatePath("/suppliers");
}

export async function removeSupplier(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  await supabase.from("suppliers").delete().eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/suppliers");
}

export async function setSupplierPrice(
  supplierId: string,
  inventoryItemId: string,
  price: number,
  reorderQuantity: number
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  await supabase.from("supplier_prices").upsert(
    {
      restaurant_id: restaurant.id,
      supplier_id: supplierId,
      inventory_item_id: inventoryItemId,
      price,
      reorder_quantity: reorderQuantity,
    },
    { onConflict: "supplier_id,inventory_item_id" }
  );
  revalidatePath("/suppliers");
}

export async function toggleAutoReorder(enabled: boolean): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  await supabase.from("restaurants").update({ auto_reorder_enabled: enabled }).eq("id", restaurant.id);
  revalidatePath("/suppliers");
}
