import Stripe from "stripe";
import type { CountryCode } from "@/lib/countries";

// Returns null (not configured) instead of throwing, so every caller can
// show a friendly "not set up yet" state — same pattern as the Claude and
// OpenAI integrations elsewhere in this app.
export function getStripeClient(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Stripe expects ISO 3166-1 alpha-2 country codes — "uk" throughout this
// app's own country config is written the colloquial way, but the ISO code
// for the United Kingdom is "GB".
const STRIPE_COUNTRY: Record<CountryCode, string> = {
  de: "DE",
  sa: "SA",
  ae: "AE",
  uk: "GB",
};

export function toStripeCountry(country: CountryCode): string {
  return STRIPE_COUNTRY[country];
}

const STRIPE_CURRENCY: Record<CountryCode, string> = {
  de: "eur",
  sa: "sar",
  ae: "aed",
  uk: "gbp",
};

export function toStripeCurrency(country: CountryCode): string {
  return STRIPE_CURRENCY[country];
}
