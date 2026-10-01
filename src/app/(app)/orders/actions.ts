"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeReceipt, type VatCategory } from "@/lib/receipts";

export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/orders");

  // Dine-in orders are billed through the table's tab when it closes (see
  // tables/actions.ts) — only pickup/delivery orders get their own receipt
  // the moment they're marked completed.
  if (status === "completed") {
    const { data: order } = await supabase
      .from("orders")
      .select("table_session_id, order_items(recipe_name, unit_price, quantity, vat_category)")
      .eq("id", orderId)
      .eq("restaurant_id", restaurant.id)
      .single();

    if (order && !order.table_session_id && order.order_items.length > 0) {
      const { items, vatBreakdown, total } = computeReceipt(
        order.order_items.map((i) => ({
          name: i.recipe_name,
          quantity: i.quantity,
          unitPrice: i.unit_price,
          vatCategory: i.vat_category as VatCategory,
        })),
        restaurant.country
      );

      await supabase.rpc("create_receipt", {
        target_restaurant_id: restaurant.id,
        target_order_id: orderId,
        target_table_session_id: null,
        payment_method: "cash",
        items,
        vat_breakdown: vatBreakdown,
        total_amount: total,
      });

      revalidatePath("/receipts");
    }
  }
}
