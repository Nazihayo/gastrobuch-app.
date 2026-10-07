"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getStripeClient } from "@/lib/stripe";

export type StartCheckoutState = { url?: string; error?: "not_configured" | "generic" };

// Platform billing: GastroHub's own Stripe customer/subscription for this
// restaurant. Deliberately never passes {stripeAccount: ...} — that option
// is reserved for Stripe Connect (the restaurant's OWN customer payments in
// src/app/menu/[restaurantId]/actions.ts). Mixing the two here would charge
// the subscription fee out of the restaurant's own connected account.
export async function startSubscriptionCheckout(): Promise<StartCheckoutState> {
  const stripe = getStripeClient();
  const priceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
  if (!stripe || !priceId) return { error: "not_configured" };

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data } = await supabase
    .from("restaurants")
    .select("stripe_customer_id")
    .eq("id", restaurant.id)
    .single();

  try {
    let customerId = data?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: restaurant.name,
        metadata: { restaurant_id: restaurant.id },
      });
      customerId = customer.id;
      await supabase
        .from("restaurants")
        .update({ stripe_customer_id: customerId })
        .eq("id", restaurant.id);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl}/billing/return`,
      cancel_url: `${siteUrl}/billing`,
      metadata: { restaurant_id: restaurant.id },
      subscription_data: { metadata: { restaurant_id: restaurant.id } },
    });

    return { url: session.url ?? undefined };
  } catch {
    return { error: "generic" };
  }
}

// Stripe's own hosted page for updating a card or canceling — the owner
// manages the subscription there instead of GastroHub reimplementing it.
export async function openBillingPortal(): Promise<StartCheckoutState> {
  const stripe = getStripeClient();
  if (!stripe) return { error: "not_configured" };

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data } = await supabase
    .from("restaurants")
    .select("stripe_customer_id")
    .eq("id", restaurant.id)
    .single();

  if (!data?.stripe_customer_id) return { error: "generic" };

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${siteUrl}/profile`,
    });
    return { url: portal.url };
  } catch {
    return { error: "generic" };
  }
}

// Called when the owner lands back on /billing/return after finishing (or
// abandoning) Stripe Checkout — the webhook is the real source of truth and
// usually wins the race, but this keeps the page from flashing "expired"
// for the few seconds before the webhook lands.
export async function refreshSubscriptionStatus(): Promise<void> {
  const stripe = getStripeClient();
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select("stripe_subscription_id")
    .eq("id", restaurant.id)
    .single();

  if (!stripe || !data?.stripe_subscription_id) return;

  const subscription = await stripe.subscriptions.retrieve(data.stripe_subscription_id);
  const status = subscription.status === "active" ? "active" : subscription.status;

  await supabase
    .from("restaurants")
    .update({ subscription_status: status === "active" ? "active" : restaurant.subscriptionStatus })
    .eq("id", restaurant.id);

  revalidatePath("/");
  revalidatePath("/billing");
}
