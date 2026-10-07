-- GastroHub's own revenue: each restaurant pays a flat monthly platform
-- subscription, completely separate from Stripe Connect (which only moves
-- the restaurant's OWN customer payments, zero platform cut). This uses the
-- platform's own Stripe customer/subscription objects — never
-- {stripeAccount: ...} — so it must never be confused with the Connect
-- checkout flow in src/app/menu/[restaurantId]/actions.ts.
alter table restaurants add column subscription_status text not null default 'trialing'
  check (subscription_status in ('trialing', 'active', 'past_due', 'canceled'));
alter table restaurants add column trial_ends_at timestamptz not null default (now() + interval '14 days');
alter table restaurants add column stripe_customer_id text;
alter table restaurants add column stripe_subscription_id text;

create index restaurants_stripe_customer_id_idx on restaurants(stripe_customer_id);
