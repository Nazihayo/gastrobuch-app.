"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { pickCheapestSupplier } from "@/lib/autoReorder";
import { sendEmail } from "@/lib/email";

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
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: updated } = await supabase
    .from("inventory_items")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id)
    .select("name, unit, needed, remaining")
    .single();

  revalidatePath("/inventory");

  // Triggered by the same manual stock-count edit an owner/staff member
  // already does — no extra click is needed to place the reorder itself,
  // see 20261010000007_auto_reorder.sql for why this can't be a DB trigger
  // (sending an email needs an HTTP call, not just a row write).
  if (patch.remaining !== undefined && updated && updated.remaining < updated.needed) {
    await maybeAutoReorder(restaurant.id, userId, id, updated.name, updated.unit);
  }
}

async function maybeAutoReorder(
  restaurantId: string,
  userId: string,
  itemId: string,
  itemName: string,
  unit: string
): Promise<void> {
  const supabase = await createClient();

  const { data: restaurantRow } = await supabase
    .from("restaurants")
    .select("auto_reorder_enabled")
    .eq("id", restaurantId)
    .single();
  if (!restaurantRow?.auto_reorder_enabled) return;

  const { data: priceRows } = await supabase
    .from("supplier_prices")
    .select("price, reorder_quantity, suppliers(id, name, email)")
    .eq("restaurant_id", restaurantId)
    .eq("inventory_item_id", itemId);

  const options = (priceRows ?? [])
    .map((row) => {
      const supplier = row.suppliers as unknown as { id: string; name: string; email: string } | null;
      if (!supplier) return null;
      return {
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierEmail: supplier.email,
        price: row.price,
        reorderQuantity: row.reorder_quantity,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);

  const cheapest = pickCheapestSupplier(options);
  if (!cheapest) return;

  const sent = await sendEmail(
    cheapest.supplierEmail,
    `Nachbestellung: ${itemName}`,
    `Bitte ${cheapest.reorderQuantity} ${unit} "${itemName}" liefern.\n\nAutomatisch ausgelöst von GastroHub, da der Lagerbestand den Sollwert unterschritten hat.`
  );

  await supabase.from("audit_log").insert({
    restaurant_id: restaurantId,
    user_id: userId,
    action: "auto_reorder",
    detail: sent
      ? `${itemName}: ${cheapest.reorderQuantity} ${unit} bei ${cheapest.supplierName} bestellt (${cheapest.price})`
      : `${itemName}: Nachbestellung bei ${cheapest.supplierName} konnte nicht gesendet werden`,
  });
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
