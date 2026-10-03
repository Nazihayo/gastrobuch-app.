"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getStripeClient, toStripeCountry } from "@/lib/stripe";

export type StartOnboardingState = { url?: string; error?: "not_configured" | "generic" };

// Creates (once) the restaurant's own Stripe Express account and returns a
// fresh onboarding link. Safe to call again later — Stripe account links
// expire after a few minutes, and an owner who didn't finish onboarding the
// first time just needs a new one for the same account.
export async function startStripeOnboarding(): Promise<StartOnboardingState> {
  const stripe = getStripeClient();
  if (!stripe) return { error: "not_configured" };

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { data } = await supabase
    .from("restaurants")
    .select("stripe_account_id")
    .eq("id", restaurant.id)
    .single();

  let accountId = data?.stripe_account_id ?? null;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: toStripeCountry(restaurant.country),
        business_type: "company",
        business_profile: { name: restaurant.name },
      });
      accountId = account.id;
      await supabase
        .from("restaurants")
        .update({ stripe_account_id: accountId })
        .eq("id", restaurant.id);
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/profile/stripe-return`,
      return_url: `${siteUrl}/profile/stripe-return`,
      type: "account_onboarding",
    });

    return { url: link.url };
  } catch {
    return { error: "generic" };
  }
}

export type StripeStatus = { onboarded: boolean };

// Called when the owner lands back on /profile/stripe-return after
// finishing (or abandoning) Stripe's onboarding flow — Stripe itself is the
// source of truth for whether the account can actually accept payments yet.
export async function refreshStripeStatus(): Promise<StripeStatus> {
  const stripe = getStripeClient();
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select("stripe_account_id")
    .eq("id", restaurant.id)
    .single();

  if (!stripe || !data?.stripe_account_id) {
    return { onboarded: false };
  }

  const account = await stripe.accounts.retrieve(data.stripe_account_id);
  const onboarded = Boolean(account.details_submitted && account.charges_enabled);

  await supabase
    .from("restaurants")
    .update({ stripe_onboarded: onboarded })
    .eq("id", restaurant.id);

  revalidatePath("/profile");
  return { onboarded };
}

export async function disconnectStripe(): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("restaurants")
    .update({ stripe_account_id: null, stripe_onboarded: false })
    .eq("id", restaurant.id);

  revalidatePath("/profile");
}
