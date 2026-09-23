"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";

export default function BreakevenCalc({
  country,
  fixed,
  actualSales,
  initialRatio,
}: {
  country: CountryCode;
  fixed: number;
  actualSales: number;
  initialRatio: number;
}) {
  const { t } = useLanguage();
  const [ratio, setRatio] = useState(initialRatio);

  const { breakevenMonthly, breakevenDaily, diff } = useMemo(() => {
    const monthly = fixed / (1 - ratio / 100);
    return { breakevenMonthly: monthly, breakevenDaily: monthly / 30, diff: actualSales - monthly };
  }, [fixed, ratio, actualSales]);

  const over = diff >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/more" className="text-sm text-text-on-ink-dim">
          {t("back")}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t("be_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("be_lead")}</p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <Row label={t("be_fixed")} value={fmtMoney(fixed, country)} />
        <div className="mt-3 flex flex-col gap-1">
          <label className="text-xs text-text-on-ink-dim">{t("be_ratio_label")}</label>
          <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
            <input
              type="number"
              min={0}
              max={90}
              step={1}
              value={ratio}
              onChange={(e) => setRatio(parseFloat(e.target.value) || 0)}
              className="w-full bg-transparent py-2 font-num text-sm outline-none"
            />
            <span className="text-xs text-text-on-ink-dim">%</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <Row label={t("be_monthly")} value={fmtMoney(breakevenMonthly, country)} />
        <Row label={t("be_daily")} value={fmtMoney(breakevenDaily, country)} />
        <Row label={t("be_actual")} value={fmtMoney(actualSales, country)} last />
      </div>

      <div
        className="flex items-center justify-between rounded-xl p-5"
        style={{ background: over ? "var(--green-deep)" : "rgba(192,85,74,0.25)" }}
      >
        <span className="text-sm font-semibold">
          {over ? t("be_status_over") : t("be_status_under")}
        </span>
        <span
          className="font-num text-xl font-bold"
          style={{ color: over ? "#7FE3B4" : "#ff9a8c" }}
        >
          {fmtMoney(Math.abs(diff), country)}
        </span>
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("be_disclaimer")}</p>
    </div>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 text-sm text-text-on-ink-dim ${
        last ? "" : "border-b border-divider"
      }`}
    >
      <span>{label}</span>
      <span className="font-num text-text-on-ink">{value}</span>
    </div>
  );
}
