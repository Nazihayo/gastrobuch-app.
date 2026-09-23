import Link from "next/link";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import type { HealthResult } from "@/lib/health";
import type { SaleResult } from "@/lib/calculations";
import Greeting from "./Greeting";

export default function DashboardView({
  locale,
  country,
  todayResult,
  totalSales,
  totalTax,
  wages,
  expenses,
  finalNet,
  showCashForecast,
  projectedFinal,
  health,
}: {
  locale: Locale;
  country: CountryCode;
  todayResult: SaleResult | null;
  totalSales: number;
  totalTax: number;
  wages: number;
  expenses: number;
  finalNet: number;
  showCashForecast: boolean;
  projectedFinal: number;
  health: HealthResult;
}) {
  const t = dictionaries[locale];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t.nav_dashboard}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t.dash_lead}</p>
      </div>

      <Greeting alerts={health.alerts} />

      <div className="rounded-xl bg-paper p-5 text-[#221F1A]">
        <div className="mb-0.5 text-xs text-[#6B6459]">{t.dash_today_card_title}</div>
        {todayResult ? (
          <div className="mt-3 flex flex-col gap-1 border-t border-dashed border-[#DCD5C4] pt-3 text-sm">
            <Row label={t.sales_total} value={fmtMoney(todayResult.total, country)} dark />
            <Row label={t.sales_vatdue} value={fmtMoney(todayResult.vatDue, country)} dark />
            <Row
              label={t.sales_net}
              value={fmtMoney(todayResult.net, country)}
              dark
              className="font-bold text-brand-green"
            />
          </div>
        ) : (
          <div className="mt-3 border-t border-dashed border-[#DCD5C4] pt-3 text-center text-sm">
            {t.dash_no_entry}
            <br />
            <Link href="/sales" className="text-brand-green">
              {t.dash_enter_today}
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">{t.dash_month_title}</h3>
        <Row label={t.dash_month_sales} value={fmtMoney(totalSales, country)} />
        <Row
          label={t.dash_month_tax}
          value={fmtMoney(totalTax, country)}
          className="text-brand-red"
        />
        <Row label={t.dash_month_wages} value={fmtMoney(wages, country)} />
        <Row label={t.dash_month_expenses} value={fmtMoney(expenses, country)} />
        <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-green-deep p-4">
          <span className="text-sm font-semibold">{t.dash_month_final}</span>
          <span className="font-num text-xl font-bold text-[#7FE3B4]">
            {fmtMoney(finalNet, country)}
          </span>
        </div>
      </div>

      {showCashForecast && (
        <div className="rounded-xl border border-divider bg-ink-soft p-5">
          <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">{t.cash_title}</h3>
          <Row
            label={t.cash_projection}
            value={fmtMoney(projectedFinal, country)}
            last
            className="text-lg font-bold text-brand-green-bright"
          />
        </div>
      )}

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">{t.health_title}</h3>
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl">{health.emoji}</span>
          <span className="font-num text-3xl font-bold">{health.score}</span>
          <span className="text-sm text-text-on-ink-dim">/100</span>
        </div>
        <div className="flex flex-col gap-1.5 text-sm text-text-on-ink-dim">
          {health.reasons.map((r, i) => (
            <div key={i}>{r}</div>
          ))}
        </div>
      </div>

      {health.alerts.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {health.alerts.map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-3 rounded-lg border border-[rgba(192,85,74,0.35)] bg-[rgba(192,85,74,0.12)] p-3 text-sm"
            >
              <span>{a.text}</span>
              <Link href={`/${a.tab}`} className="shrink-0 whitespace-nowrap text-brand-green-bright underline">
                {t.alert_open}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
  last = false,
  dark = false,
}: {
  label: string;
  value: string;
  className?: string;
  last?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 text-sm ${
        dark ? "text-[#6B6459]" : "text-text-on-ink-dim"
      } ${last ? "" : "border-b " + (dark ? "border-[#DCD5C4]" : "border-divider")}`}
    >
      <span>{label}</span>
      <span
        className={`font-num font-semibold ${className || (dark ? "text-[#221F1A]" : "text-text-on-ink")}`}
      >
        {value}
      </span>
    </div>
  );
}
