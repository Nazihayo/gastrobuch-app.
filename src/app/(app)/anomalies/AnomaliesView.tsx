"use client";

import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import type { CashRatioAnomaly, StaffCancellationSummary } from "@/lib/anomalies";

export default function AnomaliesView({
  cancellationSummary,
  cashAnomalies,
  country,
  lookbackDays,
  sinceDate,
}: {
  cancellationSummary: StaffCancellationSummary[];
  cashAnomalies: CashRatioAnomaly[];
  country: CountryCode;
  lookbackDays: number;
  sinceDate: string;
}) {
  const { t, locale } = useLanguage();
  const dateFmt = locale === "ar" ? "ar" : locale === "en" ? "en-GB" : "de-DE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("anomalies_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">
          {t("anomalies_lead").replace("{days}", String(lookbackDays))}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("anomalies_cancellations_title")}</h2>
        {cancellationSummary.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("anomalies_cancellations_empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cancellationSummary.map((s) => (
              <div
                key={s.userId}
                className="flex flex-col gap-1 rounded-lg border border-divider bg-ink-soft p-3"
              >
                <div className="flex items-baseline justify-between text-sm">
                  <span className="font-medium">{s.userLabel}</span>
                  <span className="font-num font-semibold">{fmtMoney(s.totalAmount, country)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-text-on-ink-dim">
                  <span>
                    {s.count} {t("anomalies_cancellations_count_suffix")}
                  </span>
                  {s.fastVoidCount > 0 && (
                    <span className="font-semibold text-brand-red">
                      ⚠️ {s.fastVoidCount} {t("anomalies_fast_void_suffix")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("anomalies_cash_title")}</h2>
        {cashAnomalies.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("anomalies_cash_empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {cashAnomalies.map((a) => (
              <div
                key={a.date}
                className="flex items-baseline justify-between rounded-lg border border-divider bg-ink-soft p-3 text-sm"
              >
                <span className="font-medium">
                  {new Date(a.date).toLocaleDateString(dateFmt, { dateStyle: "medium" })}
                </span>
                <span className="text-xs text-text-on-ink-dim">
                  {(a.cashRatio * 100).toFixed(0)}% {t("anomalies_cash_vs")}{" "}
                  {(a.avgCashRatio * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">
        {t("anomalies_disclaimer").replace("{date}", sinceDate)}
      </p>
    </div>
  );
}
