import Link from "next/link";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { fmtMoney, type CountryCode } from "@/lib/countries";

export default function WasteCheckView({
  locale,
  country,
  hasData,
  expected,
  actualPurch,
  warn,
}: {
  locale: Locale;
  country: CountryCode;
  hasData: boolean;
  expected: number;
  actualPurch: number;
  warn: boolean;
}) {
  const t = dictionaries[locale];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/more" className="text-sm text-text-on-ink-dim">
          {t.back}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.waste_title}</h1>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        {!hasData ? (
          <p className="text-sm text-text-on-ink-dim">{t.waste_need_data}</p>
        ) : (
          <>
            <Row label={t.waste_expected} value={fmtMoney(expected, country)} />
            <Row
              label={t.waste_actual}
              value={fmtMoney(actualPurch, country)}
              className="text-brand-red"
              last
            />
            <div
              className={`mt-3 rounded-lg p-3 text-sm ${
                warn ? "bg-[rgba(192,85,74,0.12)]" : "bg-[rgba(31,107,77,0.12)]"
              }`}
            >
              {warn ? t.waste_warn : t.waste_ok}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
  last = false,
}: {
  label: string;
  value: string;
  className?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 text-sm text-text-on-ink-dim ${
        last ? "" : "border-b border-divider"
      }`}
    >
      <span>{label}</span>
      <span className={`font-num ${className || "text-text-on-ink"}`}>{value}</span>
    </div>
  );
}
