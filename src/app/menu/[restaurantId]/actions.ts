"use server";

import { createClient } from "@/lib/supabase/server";

export type CartItem = { name: string; price: number; quantity: number };
export type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  orderType: "pickup" | "delivery";
  notes: string;
};

export type SubmitOrderError = "empty_cart" | "missing_info" | "missing_address" | "generic";
export type SubmitOrderState = { error?: SubmitOrderError; success?: boolean };

export async function submitOrder(
  restaurantId: string,
  cart: CartItem[],
  customer: CustomerInfo
): Promise<SubmitOrderState> {
  if (cart.length === 0) {
    return { error: "empty_cart" };
  }
  if (!customer.name.trim() || !customer.phone.trim()) {
    return { error: "missing_info" };
  }
  if (customer.orderType === "delivery" && !customer.address.trim()) {
    return { error: "missing_address" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_public_order", {
    target_restaurant_id: restaurantId,
    customer_name: customer.name.trim(),
    customer_phone: customer.phone.trim(),
    customer_address: customer.address.trim(),
    order_type: customer.orderType,
    notes: customer.notes.trim(),
    items: cart,
  });

  if (error) {
    return { error: "generic" };
  }

  return { success: true };
}
