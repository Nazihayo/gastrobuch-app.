"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

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
}
