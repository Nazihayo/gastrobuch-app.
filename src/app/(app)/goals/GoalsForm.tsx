"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { saveGoals } from "./actions";

export default function GoalsForm({
  country,
  initialSalesTarget,
  initialLaborPctTarget,
  initialNetTarget,
  actualSales,
  actualLaborPct,
  actualNet,
}: {
  country: CountryCode;
  initialSalesTarget: number;
  initialLaborPctTarget: number;
  initialNetTarget: number;
  actualSales: number;
  actualLaborPct: number;
  actualNet: number;
}) {
  const { t, locale } = useLanguage();
  const [salesTarget, setSalesTarget] = useState(initialSalesTarget);
  const [laborPctTarget, setLaborPctTarget] = useState(initialLaborPctTarget);
  const [netTarget, setNetTarget] = useState(initialNetTarget);
  const [, startTransition] = useTransition();

  function commit(next: {
    salesTarget?: number;
    laborPctTarget?: number;
    netTarget?: number;
  }) {
    startTransition(() => {
      saveGoals({
        salesTarget: next.salesTarget ?? salesTarget,
        laborPctTarget: next.laborPctTarget ?? laborPctTarget,
        netTarget: next.netTarget ?? netTarget,
      });
    });
  }

  const hasAnyTarget = salesTarget > 0 || laborPctTarget > 0 || netTarget > 0;
  const salesPct = salesTarget > 0 ? Math.min(100, Math.round((actualSales / salesTarget) * 100)) : 0;
  const laborOk = actualLaborPct <= laborPctTarget;
  const netPct = netTarget > 0 ? Math.min(100, Math.round((actualNet / netTarget) * 100)) : 0;
  const numFmt = locale === "ar" ? "ar" : "de-DE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("goals_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("goals_lead")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <Field label={t("goals_target_sales")}>
          <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
            <span className="text-xs text-text-on-ink-dim">{COUNTRIES[country].currency}</span>
            <input
              type="number"
              min={0}
              step={100}
              defaultValue={salesTarget || ""}
              onChange={(e) => setSalesTarget(parseFloat(e.target.value) || 0)}
              onBlur={(e) => commit({ salesTarget: parseFloat(e.target.value) || 0 })}
              className="w-full bg-transparent py-2 font-num text-sm outline-none"
            />
          </div>
        </Field>
        <Field label={t("goals_target_labor")}>
          <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              defaultValue={laborPctTarget || ""}
              onChange={(e) => setLaborPctTarget(parseFloat(e.target.value) || 0)}
              onBlur={(e) => commit({ laborPctTarget: parseFloat(e.target.value) || 0 })}
              className="w-full bg-transparent py-2 font-num text-sm outline-none"
            />
            <span className="text-xs text-text-on-ink-dim">%</span>
          </div>
        </Field>
        <Field label={t("goals_target_net")}>
          <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
            <span className="text-xs text-text-on-ink-dim">{COUNTRIES[country].currency}</span>
            <input
              type="number"
              min={0}
              step={100}
              defaultValue={netTarget || ""}
              onChange={(e) => setNetTarget(parseFloat(e.target.value) || 0)}
              onBlur={(e) => commit({ netTarget: parseFloat(e.target.value) || 0 })}
              className="w-full bg-transparent py-2 font-num text-sm outline-none"
            />
          </div>
        </Field>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        {!hasAnyTarget ? (
          <p className="text-sm text-text-on-ink-dim">{t("goals_no_target")}</p>
        ) : (
          <>
            {salesTarget > 0 && (
              <Row
                label={`${t("goals_progress_sales")} (${salesPct}%)`}
                value={`${fmtMoney(actualSales, country)} / ${fmtMoney(salesTarget, country)}`}
              />
            )}
            {laborPctTarget > 0 && (
              <Row
                label={t("goals_progress_labor")}
                value={`${actualLaborPct.toFixed(0)}% / ${laborPctTarget.toLocaleString(numFmt)}%`}
                className={laborOk ? "" : "text-brand-red"}
              />
            )}
            {netTarget > 0 && (
              <Row
                label={`${t("goals_progress_net")} (${netPct}%)`}
                value={`${fmtMoney(actualNet, country)} / ${fmtMoney(netTarget, country)}`}
                className="text-brand-green-bright"
                last
              />
            )}
          </>
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("goals_disclaimer")}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-on-ink-dim">{label}</label>
      {children}
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
