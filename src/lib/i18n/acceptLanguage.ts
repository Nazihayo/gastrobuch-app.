import type { Locale } from "./dictionaries";

const SUPPORTED: Locale[] = ["de", "ar", "en"];

// Parses a browser's Accept-Language header (e.g. "de-DE,de;q=0.9,en;q=0.8")
// and returns the first supported locale in the visitor's preference order,
// or null if none of their preferred languages are supported.
export function pickLocaleFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, qPart] = part.trim().split(";q=");
      const q = qPart !== undefined ? parseFloat(qPart) : 1;
      const primary = tag.trim().split("-")[0].toLowerCase();
      return { primary, q: Number.isNaN(q) ? 0 : q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { primary } of ranked) {
    if ((SUPPORTED as string[]).includes(primary)) return primary as Locale;
  }
  return null;
}
