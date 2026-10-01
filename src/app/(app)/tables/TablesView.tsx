"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { closeTableSession, type PaymentMethod } from "./actions";

export type TableSession = {
  id: string;
  tableNumber: string;
  openedAt: string;
  orderCount: number;
  total: number;
};

export default function TablesView({
  country,
  initialSessions,
}: {
  country: CountryCode;
  initialSessions: TableSession[];
}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [, startTransition] = useTransition();

  function close(session: TableSession, method: PaymentMethod) {
    setSessions((prev) => prev.filter((s) => s.id !== session.id));
    startTransition(async () => {
      const result = await closeTableSession(session.id, session.tableNumber, method);
      if (result.receiptId) {
        router.push(`/receipts/${result.receiptId}`);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("tables_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("tables_lead")}</p>
      </div>

      {sessions.length === 0 && (
        <p className="text-sm text-text-on-ink-dim">{t("tables_empty")}</p>
      )}

      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-divider bg-ink-soft p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-lg font-semibold">
                🍽️ {t("table_label")} {s.tableNumber}
              </span>
              <span className="font-num text-lg font-bold text-brand-green-bright">
                {fmtMoney(s.total, country)}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-on-ink-dim">
              {s.orderCount} {t("tables_order_count")} ·{" "}
              {new Date(s.openedAt).toLocaleTimeString(locale === "ar" ? "ar" : "de-DE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="mt-3 text-xs text-text-on-ink-dim">{t("tables_close_btn")}</p>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => close(s, "cash")}
                className="min-h-11 flex-1 rounded-lg bg-brand-green-bright px-3 text-sm font-semibold text-[#0A1F16]"
              >
                💵 {t("payment_cash")}
              </button>
              <button
                type="button"
                onClick={() => close(s, "card")}
                className="min-h-11 flex-1 rounded-lg border border-brand-green-bright px-3 text-sm font-semibold text-brand-green-bright"
              >
                💳 {t("payment_card")}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("tables_disclaimer")}</p>
    </div>
  );
}
