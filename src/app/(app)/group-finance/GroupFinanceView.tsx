"use client";

import { useMemo } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";

export type BranchFinance = {
  restaurantId: string;
  name: string;
  country: CountryCode;
  total: number;
  vatSalesTotal: number;
  vatDue: number;
  net: number;
};

export default function GroupFinanceView({
  branches,
  singleBranch,
}: {
  branches: BranchFinance[];
  singleBranch: boolean;
}) {
  const { t } = useLanguage();

  const byCountry = useMemo(() => {
    const groups = new Map<CountryCode, BranchFinance[]>();
    for (const b of branches) {
      const list = groups.get(b.country) ?? [];
      list.push(b);
      groups.set(b.country, list);
    }
    return Array.from(groups.entries());
  }, [branches]);

  if (singleBranch) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold">{t("group_finance_title")}</h1>
        <p className="rounded-xl border border-divider bg-ink-soft p-5 text-sm text-text-on-ink-dim">
          {t("group_finance_single_branch_lead")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("group_finance_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("group_finance_lead")}</p>
      </div>

      {byCountry.map(([country, countryBranches]) => {
        const conf = COUNTRIES[country];
        const countryTotal = countryBranches.reduce((sum, b) => sum + b.total, 0);
        const countryVatDue = countryBranches.reduce((sum, b) => sum + b.vatDue, 0);

        return (
          <div key={country} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {conf.flag} {t(`country_${country}` as const)}
              <span className="font-num text-xs font-normal text-text-on-ink-dim">
                — {t("group_finance_country_total")} {fmtMoney(countryTotal, country)}
              </span>
            </h2>
            {countryBranches.map((b) => (
              <div key={b.restaurantId} className="rounded-xl border border-divider bg-ink-soft p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{b.name}</h3>
                  <span className="font-num text-sm font-bold text-brand-green-bright">
                    {fmtMoney(b.total, country)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-text-on-ink-dim">
                  <div>
                    <div className="font-num text-sm font-semibold text-text-on-ink">
                      {fmtMoney(b.vatSalesTotal, country)}
                    </div>
                    {t("group_finance_vat_sales_label")}
                  </div>
                  <div>
                    <div className="font-num text-sm font-semibold text-text-on-ink">
                      {fmtMoney(b.vatDue, country)}
                    </div>
                    {t("group_finance_vat_due_label")}
                  </div>
                  <div>
                    <div className="font-num text-sm font-semibold text-text-on-ink">
                      {fmtMoney(b.net, country)}
                    </div>
                    {t("group_finance_net_label")}
                  </div>
                </div>
              </div>
            ))}
            <p className="text-right text-xs text-text-on-ink-dim">
              {t("group_finance_country_vat_due")} {fmtMoney(countryVatDue, country)}
            </p>
          </div>
        );
      })}

      <p className="text-xs text-text-on-ink-dim">{t("group_finance_disclaimer")}</p>
    </div>
  );
}
