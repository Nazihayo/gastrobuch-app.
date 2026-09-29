"use client";

import { useLanguage, LOCALE_NAMES } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/dictionaries";

export default function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
      className="min-h-11 rounded-full border border-divider bg-ink-soft px-4 py-2 text-xs font-semibold text-text-on-ink-dim"
    >
      {(Object.keys(LOCALE_NAMES) as Locale[]).map((l) => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
