import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe calls this once a guest actually pays — see .env.local.example for
// the two places this URL must be registered in the Stripe Dashboard (a
// normal webhook only covers the platform account; payments happen on each
// restaurant's own connected account, which needs a *Connect* webhook).
//
// The order itself is created here, from the payment confirmation — not
// when the guest starts checkout — so an abandoned Stripe Checkout page
// never leaves an order behind that was never actually paid for.
export async function POST(req: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const connectedAccountId = event.account;
  const meta = session.metadata ?? {};
  const restaurantId = meta.restaurant_id;
  if (!restaurantId || !connectedAccountId) {
    return NextResponse.json({ received: true });
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(
    session.id,
    { expand: ["data.price.product"] },
    { stripeAccount: connectedAccountId }
  );

  const cart = lineItems.data.map((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return {
      name: product?.name ?? li.description ?? "",
      price: (li.price?.unit_amount ?? 0) / 100,
      quantity: li.quantity ?? 1,
      category: (product?.metadata.category as "food" | "drink" | undefined) ?? "food",
    };
  });

  if (cart.length === 0) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("create_public_order", {
      target_restaurant_id: restaurantId,
      customer_name: meta.customer_name ?? "",
      customer_phone: meta.customer_phone ?? "",
      customer_address: meta.customer_address ?? "",
      order_type: meta.order_type ?? "pickup",
      notes: meta.notes ?? "",
      items: cart,
      p_table_number: meta.table_number ?? "",
    })
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "order creation failed" }, { status: 500 });
  }

  const orderId = (data as { order_id: string }).order_id;
  await admin
    .from("orders")
    .update({ payment_status: "paid", stripe_checkout_session_id: session.id })
    .eq("id", orderId);

  return NextResponse.json({ received: true });
}
