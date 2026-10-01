import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./dictionaries";
import { pickLocaleFromAcceptLanguage } from "./acceptLanguage";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value === "ar" || value === "de" || value === "en") return value;

  // No explicit choice saved yet (first visit) — guess from the browser's
  // language instead of always defaulting to German. A manual pick via
  // LanguageToggle always wins once it sets the cookie.
  const headerStore = await headers();
  const detected = pickLocaleFromAcceptLanguage(headerStore.get("accept-language"));
  return detected ?? DEFAULT_LOCALE;
}
