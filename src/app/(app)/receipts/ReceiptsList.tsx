"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";

export type ReceiptSummary = {
  id: string;
  receiptNumber: number;
  totalAmount: number;
  paymentMethod: string;
  issuedAt: string;
};

export default function ReceiptsList({
  country,
  initialReceipts,
}: {
  country: CountryCode;
  initialReceipts: ReceiptSummary[];
}) {
  const { t, locale } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("receipts_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("receipts_lead")}</p>
      </div>

      <div className="rounded-xl border border-brand-red bg-brand-red/10 p-4 text-xs text-brand-red">
        {t("receipts_not_tse_warning")}
      </div>

      {initialReceipts.length === 0 && (
        <p className="text-sm text-text-on-ink-dim">{t("receipts_empty")}</p>
      )}

      <div className="flex flex-col gap-2">
        {initialReceipts.map((r) => (
          <Link
            key={r.id}
            href={`/receipts/${r.id}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-divider bg-ink-soft p-3 text-sm"
          >
            <span className="font-num shrink-0">#{r.receiptNumber}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-text-on-ink-dim">
              {new Date(r.issuedAt).toLocaleString(locale === "ar" ? "ar" : "de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
            <span className="shrink-0">
              {r.paymentMethod === "cash" ? "💵" : r.paymentMethod === "card" ? "💳" : "•"}
            </span>
            <span className="font-num shrink-0 font-bold text-brand-green-bright">
              {fmtMoney(r.totalAmount, country)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
