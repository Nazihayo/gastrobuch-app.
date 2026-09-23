"use client";

import { useActionState, useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { calcSale } from "@/lib/calculations";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { saveSalesDay, type SaveSalesDayState } from "./actions";
import type { RecipeOption, SalesDayRow } from "./page";

const initialState: SaveSalesDayState = {};

function rateText(country: CountryCode): string {
  const conf = COUNTRIES[country];
  return conf.vatMode === "split"
    ? `${conf.vatFood}% / ${conf.vatDrink}%`
    : `${conf.vatRate}%`;
}

export default function SalesForm({
  country,
  locale,
  today,
  todayEntry,
  history,
  recipes,
  todayPortions,
}: {
  country: CountryCode;
  locale: "de" | "ar";
  today: string;
  todayEntry: SalesDayRow | null;
  history: SalesDayRow[];
  recipes: RecipeOption[];
  todayPortions: Record<string, number>;
}) {
  const { t } = useLanguage();
  const [portions, setPortions] = useState<Record<string, number>>(todayPortions);
  const [food, setFood] = useState(todayEntry?.food ? String(todayEntry.food) : "");
  const [drink, setDrink] = useState(todayEntry?.drink ? String(todayEntry.drink) : "");
  const [delivery, setDelivery] = useState(
    todayEntry?.delivery ? String(todayEntry.delivery) : "0"
  );
  const [commissionPct, setCommissionPct] = useState(
    todayEntry?.commission_pct != null ? String(todayEntry.commission_pct) : "30"
  );
  const [purchases, setPurchases] = useState(
    todayEntry?.purchases ? String(todayEntry.purchases) : ""
  );

  const [state, formAction, pending] = useActionState(saveSalesDay, initialState);

  const result = useMemo(
    () =>
      calcSale(
        {
          food: parseFloat(food) || 0,
          drink: parseFloat(drink) || 0,
          delivery: parseFloat(delivery) || 0,
          commissionPct: parseFloat(commissionPct) || 0,
          purchases: parseFloat(purchases) || 0,
        },
        country
      ),
    [food, drink, delivery, commissionPct, purchases, country]
  );

  const leadTxt =
    locale === "de"
      ? `Trage die heutigen Zahlen ein — die Schätzung berechnet sich sofort (USt. ${rateText(country)}).`
      : `سجّل أرقام اليوم - التقدير بيتحسب فوراً (ضريبة ${rateText(country)}).`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("sales_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{leadTxt}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <input type="hidden" name="date" value={today} />

        <Field label={t("sales_food")}>
          <MoneyInput name="food" value={food} onChange={setFood} country={country} />
        </Field>
        <Field label={t("sales_drink")}>
          <MoneyInput name="drink" value={drink} onChange={setDrink} country={country} />
        </Field>
        <Field label={t("sales_delivery")}>
          <MoneyInput name="delivery" value={delivery} onChange={setDelivery} country={country} />
        </Field>
        <Field label={t("sales_commission")}>
          <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
            <input
              type="number"
              name="commissionPct"
              min={0}
              max={100}
              step={1}
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full bg-transparent py-2 font-num text-sm outline-none"
            />
            <span className="text-xs text-text-on-ink-dim">%</span>
          </div>
        </Field>
        <Field label={t("sales_purch")}>
          <MoneyInput name="purchases" value={purchases} onChange={setPurchases} country={country} />
        </Field>

        {recipes.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-divider pt-4">
            <h3 className="text-xs font-medium text-text-on-ink-dim">
              {t("portions_title")}
            </h3>
            {recipes.map((r) => (
              <Field key={r.id} label={r.name || "—"}>
                <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={portions[r.id] || 0}
                    onChange={(e) =>
                      setPortions((prev) => ({
                        ...prev,
                        [r.id]: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-transparent py-2 font-num text-sm outline-none"
                  />
                  <span className="text-xs text-text-on-ink-dim">×</span>
                </div>
              </Field>
            ))}
            <input type="hidden" name="portions" value={JSON.stringify(portions)} />
          </div>
        )}

        {state.error && <p className="text-sm text-brand-red">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {pending ? "…" : state.savedAt ? t("sales_saved") : t("sales_save")}
        </button>
      </form>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">
          {t("sales_result_title")}
        </h3>
        <OutRow label={t("sales_total")} value={fmtMoney(result.total, country)} />
        <OutRow label={t("sales_vat")} value={fmtMoney(result.vatSalesTotal, country)} />
        <OutRow label={t("sales_vatpurch")} value={fmtMoney(result.vatPurch, country)} />
        <OutRow
          label={t("sales_vatdue")}
          value={fmtMoney(result.vatDue, country)}
          className="text-brand-red"
        />
        {result.delivery > 0 && (
          <OutRow
            label={t("sales_commission_amount")}
            value={fmtMoney(result.commissionAmount, country)}
            className="text-brand-red"
          />
        )}
        <OutRow
          label={t("sales_net")}
          value={fmtMoney(result.net, country)}
          className="text-brand-green-bright text-lg font-bold"
          last
        />
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">
          {t("sales_history_title")}
        </h3>
        {history.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("sales_history_empty")}</p>
        ) : (
          history.map((row) => {
            const r = calcSale(
              {
                food: row.food,
                drink: row.drink,
                delivery: row.delivery,
                commissionPct: row.commission_pct,
                purchases: row.purchases,
              },
              country
            );
            return (
              <div
                key={row.date}
                className="flex justify-between border-b border-divider py-2 text-sm last:border-none"
              >
                <span>{row.date}</span>
                <span className="font-num">{fmtMoney(r.net, country)}</span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("sales_disclaimer")}</p>
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
    <div className="flex items-center gap-2 rounded-lg border border-divider bg-ink px-3 py-1">
      <span className="text-xs text-text-on-ink-dim">{COUNTRIES[country].currency}</span>
      <input
        type="number"
        name={name}
        min={0}
        step={10}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-2 font-num text-sm outline-none"
      />
    </div>
  );
}

function OutRow({
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
