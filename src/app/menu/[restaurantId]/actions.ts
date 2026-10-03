"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripeClient, toStripeCurrency } from "@/lib/stripe";
import type { CountryCode } from "@/lib/countries";

export type CartItem = {
  name: string;
  price: number;
  quantity: number;
  category: "food" | "drink";
};
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
  justReachedTierName: string | null;
  justReachedTierReward: string | null;
  nextTierName: string | null;
  nextTierThreshold: number | null;
  nextTierReward: string | null;
};
export type SubmitOrderState = {
  error?: SubmitOrderError;
  success?: boolean;
  orderId?: string;
  loyalty?: LoyaltyProgress;
};

function validateOrder(cart: CartItem[], customer: CustomerInfo): SubmitOrderError | null {
  if (cart.length === 0) return "empty_cart";
  if (!customer.name.trim() || !customer.phone.trim()) return "missing_info";
  if (customer.orderType === "delivery" && !customer.address.trim()) return "missing_address";
  if (customer.orderType === "dine_in" && !customer.tableNumber.trim()) return "missing_table";
  return null;
}

export async function submitOrder(
  restaurantId: string,
  cart: CartItem[],
  customer: CustomerInfo
): Promise<SubmitOrderState> {
  const validationError = validateOrder(cart, customer);
  if (validationError) {
    return { error: validationError };
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
    just_reached_tier_name: string | null;
    just_reached_tier_reward: string | null;
    next_tier_name: string | null;
    next_tier_threshold: number | null;
    next_tier_reward: string | null;
  };

  if (!row.just_reached_tier_name && !row.next_tier_name) {
    return { success: true, orderId: row.order_id };
  }

  return {
    success: true,
    orderId: row.order_id,
    loyalty: {
      totalOrders: row.customer_total_orders,
      justReachedTierName: row.just_reached_tier_name,
      justReachedTierReward: row.just_reached_tier_reward,
      nextTierName: row.next_tier_name,
      nextTierThreshold: row.next_tier_threshold,
      nextTierReward: row.next_tier_reward,
    },
  };
}

export type CreateCheckoutSessionState = { url?: string; error?: SubmitOrderError | "not_available" | "generic" };

// Creates a Stripe Checkout Session directly on the restaurant's own
// connected Stripe account (a "direct charge") — the restaurant is the
// merchant of record and gets the money straight away, no platform fee.
// The order itself is only created once Stripe confirms payment, via the
// webhook (see /api/stripe/webhook) — not here — so an abandoned checkout
// never leaves a ghost "unpaid" order behind.
export async function createCheckoutSession(
  restaurantId: string,
  cart: CartItem[],
  customer: CustomerInfo
): Promise<CreateCheckoutSessionState> {
  const validationError = validateOrder(cart, customer);
  if (validationError) {
    return { error: validationError };
  }

  const stripe = getStripeClient();
  if (!stripe) return { error: "not_available" };

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("stripe_account_id, stripe_onboarded, country")
    .eq("id", restaurantId)
    .single();

  if (!restaurant?.stripe_onboarded || !restaurant.stripe_account_id) {
    return { error: "not_available" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const currency = toStripeCurrency(restaurant.country as CountryCode);

  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: cart.map((item) => ({
          price_data: {
            currency,
            product_data: { name: item.name, metadata: { category: item.category } },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        success_url: `${siteUrl}/menu/${restaurantId}/paid?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/menu/${restaurantId}`,
        metadata: {
          restaurant_id: restaurantId,
          customer_name: customer.name.trim(),
          customer_phone: customer.phone.trim(),
          customer_address: customer.address.trim(),
          order_type: customer.orderType,
          notes: customer.notes.trim(),
          table_number: customer.tableNumber.trim(),
        },
      },
      { stripeAccount: restaurant.stripe_account_id }
    );

    if (!session.url) return { error: "generic" };
    return { url: session.url };
  } catch {
    return { error: "generic" };
  }
}
