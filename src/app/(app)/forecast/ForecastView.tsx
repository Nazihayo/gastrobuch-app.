"use client";

import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import type { ForecastDayResult } from "@/lib/forecast";

const WEEKDAY_KEYS = [
  "forecast_sunday",
  "forecast_monday",
  "forecast_tuesday",
  "forecast_wednesday",
  "forecast_thursday",
  "forecast_friday",
  "forecast_saturday",
] as const;

export default function ForecastView({
  country,
  forecast,
}: {
  country: CountryCode;
  forecast: ForecastDayResult[];
}) {
  const { t, locale } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("forecast_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("forecast_lead")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {forecast.map((day) => (
          <div key={day.date} className="rounded-xl border border-divider bg-ink-soft p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{t(WEEKDAY_KEYS[day.weekday])}</span>
              <span className="font-num text-xs text-text-on-ink-dim">
                {new Date(`${day.date}T00:00:00`).toLocaleDateString(
                  locale === "ar" ? "ar" : "de-DE",
                  { day: "2-digit", month: "2-digit" }
                )}
              </span>
            </div>

            {day.sampleSize === 0 ? (
              <p className="mt-2 text-xs text-text-on-ink-dim">{t("forecast_no_data")}</p>
            ) : (
              <>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-xs text-text-on-ink-dim">
                    {t("forecast_avg_revenue")} ({day.sampleSize}× {t("forecast_sample_size")})
                  </span>
                  <span className="font-num text-lg font-bold text-brand-green-bright">
                    {fmtMoney(day.avgRevenue ?? 0, country)}
                  </span>
                </div>
                {day.topItems.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1 border-t border-divider pt-2">
                    {day.topItems.map((item) => (
                      <div key={item.name} className="flex justify-between text-xs">
                        <span className="text-text-on-ink-dim">{item.name}</span>
                        <span className="font-num">
                          ~{item.avgPortions} {t("forecast_portions")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("forecast_disclaimer")}</p>
    </div>
  );
}
