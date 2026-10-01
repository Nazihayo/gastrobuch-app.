import type { CountryCode } from "@/lib/countries";

// International calling codes, for turning a locally-formatted number
// (e.g. "0151 2345678") into the digits-only format wa.me requires.
const DIAL_CODES: Record<CountryCode, string> = {
  de: "49",
  sa: "966",
  ae: "971",
  uk: "44",
};

// wa.me links take a phone number as plain digits (country code + number,
// no "+", spaces or leading zero) — this is the "click to chat" format
// WhatsApp documents, not an API call, so it needs no credentials or
// approval and costs nothing.
export function toWhatsAppDigits(phone: string, country: CountryCode): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith(DIAL_CODES[country])) return digits;
  if (digits.startsWith("0")) return DIAL_CODES[country] + digits.slice(1);
  return DIAL_CODES[country] + digits;
}

export function buildWhatsAppLink(phone: string, country: CountryCode, message: string): string {
  const digits = toWhatsAppDigits(phone, country);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
