"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";

export default function ScenarioLab({
  country,
  baseSales,
  baseNetFromSales,
  baseNet,
  wages,
  expenses,
}: {
  country: CountryCode;
  baseSales: number;
  baseNetFromSales: number;
  baseNet: number;
  wages: number;
  expenses: number;
}) {
  const { t } = useLanguage();
  const [priceChangePct, setPriceChangePct] = useState(0);
  const [newStaffHours, setNewStaffHours] = useState(0);
  const [newStaffRate, setNewStaffRate] = useState(13.9);
  const [closedDays, setClosedDays] = useState(0);

  const { scenarioNet, diff } = useMemo(() => {
    const adjustedSales =
      baseSales * (1 + priceChangePct / 100) * Math.max(0, (30 - closedDays) / 30);
    const marginRatio = baseSales > 0 ? baseNetFromSales / baseSales : 0;
    const scenarioGrossNet = adjustedSales * marginRatio;
    const net = scenarioGrossNet - wages - newStaffHours * newStaffRate - expenses;
    return { scenarioNet: net, diff: net - baseNet };
  }, [baseSales, baseNetFromSales, wages, expenses, baseNet, priceChangePct, newStaffHours, newStaffRate, closedDays]);

  const more = diff >= 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("scn_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("scn_lead")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <Field label={t("scn_price_change")} unit="%">
          <input
            type="number"
            step={1}
            value={priceChangePct}
            onChange={(e) => setPriceChangePct(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent py-2 font-num text-sm outline-none"
          />
        </Field>
        <Field label={t("scn_new_staff")}>
          <input
            type="number"
            min={0}
            step={10}
            value={newStaffHours}
            onChange={(e) => setNewStaffHours(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent py-2 font-num text-sm outline-none"
          />
        </Field>
        <Field label={t("scn_new_staff_rate")}>
          <input
            type="number"
            min={0}
            step={0.1}
            value={newStaffRate}
            onChange={(e) => setNewStaffRate(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent py-2 font-num text-sm outline-none"
          />
        </Field>
        <Field label={t("scn_closed_days")}>
          <input
            type="number"
            min={0}
            max={30}
            step={1}
            value={closedDays}
            onChange={(e) => setClosedDays(parseFloat(e.target.value) || 0)}
            className="w-full bg-transparent py-2 font-num text-sm outline-none"
          />
        </Field>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">
          {t("scn_compare_title")}
        </h3>
        <Row label={t("scn_col_current")} value={fmtMoney(baseNet, country)} />
        <Row
          label={t("scn_col_scenario")}
          value={fmtMoney(scenarioNet, country)}
          className="text-brand-green-bright text-lg font-bold"
          last
        />
      </div>

      <div
        className="flex items-center justify-between rounded-xl p-5"
        style={{ background: more ? "var(--green-deep)" : "rgba(192,85,74,0.25)" }}
      >
        <span className="text-sm font-semibold">
          {more ? t("scn_diff_more") : t("scn_diff_less")}
        </span>
        <span
          className="font-num text-xl font-bold"
          style={{ color: more ? "#7FE3B4" : "#ff9a8c" }}
        >
          {fmtMoney(Math.abs(diff), country)}
        </span>
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("scn_disclaimer")}</p>
    </div>
  );
}

function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-on-ink-dim">{label}</label>
      <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
        {children}
        {unit && <span className="text-xs text-text-on-ink-dim">{unit}</span>}
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
