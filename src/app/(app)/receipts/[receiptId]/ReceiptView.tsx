"use client";

import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";

export type ReceiptItem = {
  name: string;
  quantity: number;
  unit_price: number;
  vat_category: string;
  line_total: number;
};

export default function ReceiptView({
  country,
  restaurantName,
  restaurantAddress,
  receiptNumber,
  items,
  vatBreakdown,
  totalAmount,
  paymentMethod,
  issuedAt,
}: {
  country: CountryCode;
  restaurantName: string;
  restaurantAddress: string;
  receiptNumber: number;
  items: ReceiptItem[];
  vatBreakdown: Record<string, number>;
  totalAmount: number;
  paymentMethod: string;
  issuedAt: string;
}) {
  const { t, locale } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-brand-red bg-brand-red/10 p-4 text-xs text-brand-red">
        {t("receipts_not_tse_warning")}
      </div>

      <div className="mx-auto w-full max-w-sm rounded-xl border border-divider bg-ink-soft p-6">
        <div className="mb-4 text-center">
          <p className="font-display text-lg font-bold">{restaurantName}</p>
          {restaurantAddress && (
            <p className="text-xs text-text-on-ink-dim">{restaurantAddress}</p>
          )}
        </div>

        <div className="mb-3 flex justify-between font-num text-xs text-text-on-ink-dim">
          <span>
            {t("receipts_number_label")} #{receiptNumber}
          </span>
          <span>
            {new Date(issuedAt).toLocaleString(locale === "ar" ? "ar" : "de-DE", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>

        <div className="flex flex-col gap-1 border-y border-divider py-3 text-sm">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="min-w-0 truncate">
                {item.quantity}× {item.name || "—"}
              </span>
              <span className="font-num shrink-0">{fmtMoney(item.line_total, country)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-text-on-ink-dim">
          {Object.entries(vatBreakdown).map(([rate, amount]) => (
            <div key={rate} className="flex justify-between font-num">
              <span>
                {t("receipts_vat_label")} {rate}%
              </span>
              <span>{fmtMoney(amount, country)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex justify-between border-t border-divider pt-3 text-base font-bold">
          <span>{t("receipts_total_label")}</span>
          <span className="font-num text-brand-green-bright">
            {fmtMoney(totalAmount, country)}
          </span>
        </div>

        <p className="mt-2 text-center text-xs text-text-on-ink-dim">
          {paymentMethod === "cash"
            ? t("receipts_paid_cash")
            : paymentMethod === "card"
              ? t("receipts_paid_card")
              : paymentMethod}
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="mx-auto min-h-11 rounded-lg border border-divider px-6 text-sm font-semibold"
      >
        {t("receipts_print_btn")}
      </button>
    </div>
  );
}
