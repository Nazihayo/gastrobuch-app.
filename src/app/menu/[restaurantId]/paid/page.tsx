import { notFound } from "next/navigation";
import { getStripeClient } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import PaidView from "./PaidView";

export default async function PaidPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { restaurantId } = await params;
  const { session_id: sessionId } = await searchParams;
  const stripe = getStripeClient();

  if (!stripe || !sessionId) {
    notFound();
  }

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, stripe_account_id")
    .eq("id", restaurantId)
    .single();

  if (!restaurant?.stripe_account_id) {
    notFound();
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, undefined, {
    stripeAccount: restaurant.stripe_account_id,
  });

  const paid = session.payment_status === "paid";

  return <PaidView restaurantName={restaurant.name} paid={paid} />;
}
