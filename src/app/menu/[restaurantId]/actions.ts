"use server";

import { createClient } from "@/lib/supabase/server";

export type CartItem = { name: string; price: number; quantity: number };
export type CustomerInfo = {
  name: string;
  phone: string;
  address: string;
  tableNumber: string;
  orderType: "pickup" | "delivery" | "dine_in";
  notes: string;
};

export type SubmitOrderError =
  | "empty_cart"
  | "missing_info"
  | "missing_address"
  | "missing_table"
  | "generic";
export type LoyaltyProgress = {
  totalOrders: number;
  threshold: number;
  reward: string;
  rewardEarned: boolean;
};
export type SubmitOrderState = {
  error?: SubmitOrderError;
  success?: boolean;
  orderId?: string;
  loyalty?: LoyaltyProgress;
};

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
  if (customer.orderType === "dine_in" && !customer.tableNumber.trim()) {
    return { error: "missing_table" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("create_public_order", {
      target_restaurant_id: restaurantId,
      customer_name: customer.name.trim(),
      customer_phone: customer.phone.trim(),
      customer_address: customer.address.trim(),
      order_type: customer.orderType,
      notes: customer.notes.trim(),
      items: cart,
      p_table_number: customer.tableNumber.trim(),
    })
    .single();

  if (error || !data) {
    return { error: "generic" };
  }

  const row = data as {
    order_id: string;
    customer_total_orders: number;
    loyalty_threshold: number;
    loyalty_reward: string;
    reward_earned: boolean;
  };

  if (!row.loyalty_reward) {
    return { success: true, orderId: row.order_id };
  }

  return {
    success: true,
    orderId: row.order_id,
    loyalty: {
      totalOrders: row.customer_total_orders,
      threshold: row.loyalty_threshold,
      reward: row.loyalty_reward,
      rewardEarned: row.reward_earned,
    },
  };
}
