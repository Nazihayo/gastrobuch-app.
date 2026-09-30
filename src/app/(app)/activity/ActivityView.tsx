"use client";

import { useLanguage } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/dictionaries";

export type ActivityEntry = {
  id: string;
  email: string;
  action: string;
  detail: string;
  createdAt: string;
};

const ACTION_KEYS: Record<string, TranslationKey> = {
  customer_added: "activity_customer_added",
  customer_removed: "activity_customer_removed",
  expense_added: "activity_expense_added",
  expense_removed: "activity_expense_removed",
  inventory_item_added: "activity_inventory_added",
  inventory_item_removed: "activity_inventory_removed",
  recipe_added: "activity_recipe_added",
  recipe_removed: "activity_recipe_removed",
  sales_day_saved: "activity_sales_saved",
  staff_member_added: "activity_staff_added",
  staff_member_removed: "activity_staff_removed",
  table_session_closed: "activity_table_closed",
};

export default function ActivityView({ entries }: { entries: ActivityEntry[] }) {
  const { t, locale } = useLanguage();
  const dateFmt = locale === "ar" ? "ar" : locale === "en" ? "en-GB" : "de-DE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("activity_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("activity_lead")}</p>
      </div>

      <div className="flex flex-col gap-2">
        {entries.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">{t("activity_empty")}</p>
        )}
        {entries.map((e) => {
          const key = ACTION_KEYS[e.action];
          const label = key ? t(key) : e.action;
          const when = new Date(e.createdAt).toLocaleString(dateFmt, {
            dateStyle: "medium",
            timeStyle: "short",
          });
          return (
            <div
              key={e.id}
              className="flex flex-col gap-0.5 rounded-lg border border-divider bg-ink p-3 text-sm"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">
                  {label}
                  {e.detail ? ` — ${e.detail}` : ""}
                </span>
                <span className="shrink-0 font-num text-xs text-text-on-ink-dim">{when}</span>
              </div>
              <span className="text-xs text-text-on-ink-dim">{e.email}</span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("activity_disclaimer")}</p>
    </div>
  );
}
