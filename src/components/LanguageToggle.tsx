"use client";

import { useLanguage } from "@/lib/i18n/context";

export default function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLocale(locale === "de" ? "ar" : "de")}
      className="min-h-11 rounded-full border border-divider bg-ink-soft px-4 py-2 text-xs font-semibold text-text-on-ink-dim font-num"
    >
      {t("lang_toggle")}
    </button>
  );
}
