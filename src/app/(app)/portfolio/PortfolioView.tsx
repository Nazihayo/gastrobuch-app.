"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { getPortfolioRecommendation } from "./actions";

export type BrandStat = {
  restaurantId: string;
  name: string;
  country: CountryCode;
  orderCount30d: number;
  revenue30d: number;
  avgOrderValue: number;
  repeatRatePct: number;
};

export default function PortfolioView({
  stats,
  singleBrand,
}: {
  stats: BrandStat[];
  singleBrand: boolean;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [error, setError] = useState<"not_configured" | "generic" | null>(null);

  async function handleGetRecommendation() {
    setPending(true);
    setError(null);
    const result = await getPortfolioRecommendation(stats);
    setPending(false);
    if (result.text) setRecommendation(result.text);
    else setError(result.error ?? "generic");
  }

  if (singleBrand) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold">{t("portfolio_title")}</h1>
        <p className="rounded-xl border border-divider bg-ink-soft p-5 text-sm text-text-on-ink-dim">
          {t("portfolio_single_brand_lead")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("portfolio_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("portfolio_lead")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {stats.map((brand, i) => (
          <div key={brand.restaurantId} className="rounded-xl border border-divider bg-ink-soft p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {i === 0 && "🥇 "}
                {brand.name}
              </h2>
              <span className="font-num text-sm font-bold text-brand-green-bright">
                {fmtMoney(brand.revenue30d, brand.country)}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-text-on-ink-dim">
              <div>
                <div className="font-num text-sm font-semibold text-text-on-ink">{brand.orderCount30d}</div>
                {t("portfolio_orders_label")}
              </div>
              <div>
                <div className="font-num text-sm font-semibold text-text-on-ink">
                  {fmtMoney(brand.avgOrderValue, brand.country)}
                </div>
                {t("portfolio_aov_label")}
              </div>
              <div>
                <div className="font-num text-sm font-semibold text-text-on-ink">{brand.repeatRatePct}%</div>
                {t("portfolio_repeat_label")}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5">
        <h2 className="text-sm font-semibold">🤖 {t("portfolio_ai_title")}</h2>
        {recommendation ? (
          <p className="whitespace-pre-wrap text-sm text-text-on-ink-dim">{recommendation}</p>
        ) : (
          <button
            type="button"
            onClick={handleGetRecommendation}
            disabled={pending}
            className="min-h-11 rounded-full bg-brand-green-bright px-4 py-2 text-sm font-bold text-ink disabled:opacity-60"
          >
            {pending ? "…" : t("portfolio_ai_btn")}
          </button>
        )}
        {error && (
          <p className="text-xs text-brand-red">
            {error === "not_configured" ? t("portfolio_ai_not_configured") : t("portfolio_ai_error")}
          </p>
        )}
      </div>
    </div>
  );
}
