"use client";

import { useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { buildDatevExport, datevFilename, type DatevConfig } from "@/lib/datev";
import type { ReportDay } from "@/lib/reportData";

function deNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export default function ReportView({
  locale,
  country,
  totalSales,
  totalTax,
  wages,
  expenses,
  finalNet,
  days,
  periodStart,
  periodEnd,
  datevConfig,
}: {
  locale: Locale;
  country: CountryCode;
  totalSales: number;
  totalTax: number;
  wages: number;
  expenses: number;
  finalNet: number;
  days: ReportDay[];
  periodStart: string;
  periodEnd: string;
  datevConfig: DatevConfig;
}) {
  const t = dictionaries[locale];
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  function downloadFile(content: string, filename: string) {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function handleDatevExport() {
    const csv = buildDatevExport(days, wages, expenses, datevConfig, periodStart, periodEnd);
    downloadFile(csv, datevFilename(periodStart));
    setExportStatus(t.rep_export_done);
  }

  function handleExport() {
    const rows = [
      "Datum;Speisenumsatz;Getraenkeumsatz;Lieferdienst;Kommission;Wareneinkauf;USt.faellig;Netto",
      ...days.map((d) =>
        [
          d.date,
          deNum(d.food),
          deNum(d.drink),
          deNum(d.delivery),
          deNum(d.commissionAmount),
          deNum(d.purchases),
          deNum(d.vatDue),
          deNum(d.net),
        ].join(";")
      ),
      "",
      `Summe Umsatz;;;;;;;${deNum(totalSales)}`,
      `Summe USt.;;;;;;;${deNum(totalTax)}`,
      `Loehne gesamt;;;;;;;${deNum(wages)}`,
      `Fixkosten gesamt;;;;;;;${deNum(expenses)}`,
      `Geschaetzter Reingewinn;;;;;;;${deNum(finalNet)}`,
    ];

    const csv = "﻿" + rows.join("\r\n");
    const monthPrefix = periodStart.slice(0, 7);
    downloadFile(csv, `gastrobuch-bericht-${monthPrefix}.csv`);
    setExportStatus(t.rep_export_done);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t.rep_title}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t.rep_lead}</p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <Row label={t.dash_month_sales} value={fmtMoney(totalSales, country)} />
        <Row label={t.dash_month_tax} value={fmtMoney(totalTax, country)} className="text-brand-red" />
        <Row label={t.dash_month_wages} value={fmtMoney(wages, country)} />
        <Row label={t.dash_month_expenses} value={fmtMoney(expenses, country)} last />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-brand-green-deep p-5">
        <span className="text-sm font-semibold">{t.dash_month_final}</span>
        <span className="font-num text-xl font-bold text-[#7FE3B4]">
          {fmtMoney(finalNet, country)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16]"
        >
          {t.rep_export_btn}
        </button>
        <button
          type="button"
          onClick={handleDatevExport}
          className="min-h-11 rounded-lg border border-divider bg-ink-soft px-4 py-3 text-sm font-semibold"
        >
          {t.rep_export_datev_btn}
        </button>
        {exportStatus && (
          <p className="text-center text-xs text-text-on-ink-dim">{exportStatus}</p>
        )}
        <p className="text-center text-xs text-brand-red">{t.rep_export_datev_disclaimer}</p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">{t.rep_days_title}</h3>
        {days.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t.rep_days_empty}</p>
        ) : (
          days
            .slice()
            .reverse()
            .map((d) => (
              <div
                key={d.date}
                className="flex justify-between border-b border-divider py-2 text-sm last:border-none"
              >
                <span>{d.date}</span>
                <span className="font-num">{fmtMoney(d.net, country)}</span>
              </div>
            ))
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t.rep_disclaimer}</p>
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
