"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeReceipt, type VatCategory } from "@/lib/receipts";

export type PaymentMethod = "cash" | "card" | "other";
export type CloseTableResult = { receiptId?: string; error?: string };

export async function closeTableSession(
  sessionId: string,
  tableNumber: string,
  paymentMethod: PaymentMethod
): Promise<CloseTableResult> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("table_sessions")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "table_session_closed",
    detail: tableNumber,
  });

  revalidatePath("/tables");

  const { data: orders } = await supabase
    .from("orders")
    .select("status, order_items(recipe_name, unit_price, quantity, vat_category)")
    .eq("table_session_id", sessionId)
    .eq("restaurant_id", restaurant.id);

  const allItems = (orders ?? [])
    .filter((o) => o.status !== "cancelled")
    .flatMap((o) => o.order_items);

  if (allItems.length === 0) {
    return { error: "no_items" };
  }

  const { items, vatBreakdown, total } = computeReceipt(
    allItems.map((i) => ({
      name: i.recipe_name,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      vatCategory: i.vat_category as VatCategory,
    })),
    restaurant.country
  );

  const { data: receipt, error } = await supabase.rpc("create_receipt", {
    target_restaurant_id: restaurant.id,
    target_order_id: null,
    target_table_session_id: sessionId,
    payment_method: paymentMethod,
    items,
    vat_breakdown: vatBreakdown,
    total_amount: total,
  });

  if (error || !receipt) {
    return { error: error?.message ?? "generic" };
  }

  revalidatePath("/receipts");
  return { receiptId: (receipt as { id: string }).id };
}
