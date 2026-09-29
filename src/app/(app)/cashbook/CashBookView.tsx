"use client";

import { useActionState, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { saveCashCount, type SaveCashCountState } from "./actions";

type CashRow = {
  date: string;
  opening_balance: number;
  cash_sales: number;
  counted_closing: number;
};

const initialState: SaveCashCountState = {};

export default function CashBookView({
  country,
  today,
  todayRow,
  history,
}: {
  country: CountryCode;
  today: string;
  todayRow: (CashRow & { notes: string }) | null;
  history: CashRow[];
}) {
  const { t } = useLanguage();
  const [opening, setOpening] = useState(String(todayRow?.opening_balance ?? ""));
  const [cashSales, setCashSales] = useState(String(todayRow?.cash_sales ?? ""));
  const [counted, setCounted] = useState(String(todayRow?.counted_closing ?? ""));
  const [state, formAction, pending] = useActionState(saveCashCount, initialState);

  const { expected, difference } = useMemo(() => {
    const exp = (parseFloat(opening) || 0) + (parseFloat(cashSales) || 0);
    return { expected: exp, difference: (parseFloat(counted) || 0) - exp };
  }, [opening, cashSales, counted]);

  const isOk = Math.abs(difference) < 0.01;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("cb_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("cb_lead")}</p>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5"
      >
        <input type="hidden" name="date" value={today} />
        <Field label={t("cb_opening")}>
          <MoneyInput value={opening} onChange={setOpening} country={country} name="openingBalance" />
        </Field>
        <Field label={t("cb_cash_sales")}>
          <MoneyInput value={cashSales} onChange={setCashSales} country={country} name="cashSales" />
        </Field>
        <Field label={t("cb_counted")}>
          <MoneyInput value={counted} onChange={setCounted} country={country} name="countedClosing" />
        </Field>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-text-on-ink-dim">{t("cb_notes_ph")}</label>
          <input
            type="text"
            name="notes"
            defaultValue={todayRow?.notes ?? ""}
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
        </div>

        {state.error && <p className="text-sm text-brand-red">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {pending ? "…" : state.savedAt ? t("sales_saved") : t("cb_save")}
        </button>
      </form>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <Row label={t("cb_expected")} value={fmtMoney(expected, country)} />
        <Row
          label={t("cb_difference")}
          value={fmtMoney(difference, country)}
          className={isOk ? "text-brand-green-bright" : "text-brand-red"}
          last
        />
        <p className={`mt-3 text-center text-sm font-semibold ${isOk ? "text-brand-green-bright" : "text-brand-red"}`}>
          {isOk ? t("cb_ok") : difference > 0 ? t("cb_over") : t("cb_short")}
        </p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">{t("cb_history_title")}</h3>
        {history.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("cb_history_empty")}</p>
        ) : (
          history.map((row) => {
            const exp = (row.opening_balance || 0) + (row.cash_sales || 0);
            const diff = (row.counted_closing || 0) - exp;
            const ok = Math.abs(diff) < 0.01;
            return (
              <div
                key={row.date}
                className="flex justify-between border-b border-divider py-2 text-sm last:border-none"
              >
                <span>{row.date}</span>
                <span className={`font-num ${ok ? "text-text-on-ink-dim" : "text-brand-red"}`}>
                  {ok ? "✓" : fmtMoney(diff, country)}
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("cb_disclaimer")}</p>
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

function MoneyInput({
  name,
  value,
  onChange,
  country,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  country: CountryCode;
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
      <span className="text-xs text-text-on-ink-dim">{COUNTRIES[country].currency}</span>
      <input
        type="number"
        name={name}
        min={0}
        step={0.01}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-2 font-num text-sm outline-none"
      />
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
