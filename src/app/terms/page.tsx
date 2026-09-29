import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { termsContent } from "@/lib/legal";

export default async function TermsPage() {
  const locale = await getLocale();
  const content = termsContent[locale];

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="font-display text-2xl font-bold">{content.title}</h1>
        <p className="mt-1 text-xs text-text-on-ink-dim">{content.updated}</p>
        <p className="mt-3 text-sm text-text-on-ink-dim">{content.intro}</p>
      </div>
      <div className="flex flex-col gap-5">
        {content.sections.map((s) => (
          <div key={s.heading}>
            <h2 className="text-sm font-semibold">{s.heading}</h2>
            <p className="mt-1 text-sm text-text-on-ink-dim">{s.body}</p>
          </div>
        ))}
      </div>
      <Link href="/login" className="min-h-11 text-sm text-brand-green-bright underline">
        {locale === "ar" ? "‹ رجوع لتسجيل الدخول" : "‹ Zurück zur Anmeldung"}
      </Link>
    </main>
  );
}
