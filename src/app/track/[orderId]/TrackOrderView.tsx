"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney } from "@/lib/countries";
import { getOrderStatus, submitReview, type PublicOrderStatus } from "./actions";
import type { OrderStatus } from "@/app/(app)/orders/actions";

const STEPS: OrderStatus[] = ["new", "confirmed", "preparing", "ready", "completed"];
const POLL_INTERVAL_MS = 15000;

export default function TrackOrderView({
  orderId,
  initialOrder,
}: {
  orderId: string;
  initialOrder: PublicOrderStatus;
}) {
  const { t, locale } = useLanguage();
  const [order, setOrder] = useState(initialOrder);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const next = await getOrderStatus(orderId);
      if (next) setOrder(next);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [orderId]);

  const stepIndex = STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  async function handleSubmitReview() {
    if (rating === 0) return;
    setSubmitting(true);
    setReviewError(null);
    const result = await submitReview(orderId, rating, comment);
    setSubmitting(false);
    if ("error" in result) {
      setReviewError(t("review_submit_error"));
      return;
    }
    setOrder((prev) => ({ ...prev, alreadyReviewed: true }));
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold">{order.restaurantName}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("track_lead")}</p>
        {order.orderType === "dine_in" && order.tableNumber && (
          <p className="mt-1 text-xs text-text-on-ink-dim">
            🍽️ {t("table_label")} {order.tableNumber}
          </p>
        )}
      </div>

      {isCancelled ? (
        <div className="rounded-xl border border-brand-red bg-brand-red/10 px-4 py-5 text-center">
          <p className="text-sm font-semibold text-brand-red">{t("order_status_cancelled")}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5">
          {STEPS.map((step, i) => {
            const done = i <= stepIndex;
            return (
              <div key={step} className="flex items-center gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    done
                      ? "bg-brand-green-bright text-[#0A1F16]"
                      : "border border-divider text-text-on-ink-dim"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`text-sm ${
                    i === stepIndex
                      ? "font-semibold text-text-on-ink"
                      : done
                        ? "text-text-on-ink-dim"
                        : "text-text-on-ink-dim opacity-50"
                  }`}
                >
                  {t(`order_status_${step}` as const)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between rounded-xl border border-divider bg-ink-soft p-4 text-sm">
        <span className="text-text-on-ink-dim">
          {new Date(order.createdAt).toLocaleTimeString(locale === "ar" ? "ar" : "de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span className="font-num font-bold text-brand-green-bright">
          {fmtMoney(order.totalEstimate, order.restaurantCountry)}
        </span>
      </div>

      {order.orderType === "dine_in" && order.tableSessionTotal !== null && (
        <div className="rounded-xl border border-brand-green-bright/40 bg-brand-green-bright/10 p-4 text-center">
          <p className="text-sm text-text-on-ink-dim">
            {t("track_table_total_prefix")}{" "}
            <span className="font-num font-bold text-brand-green-bright">
              {fmtMoney(order.tableSessionTotal, order.restaurantCountry)}
            </span>
          </p>
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("track_table_total_hint")}</p>
        </div>
      )}

      {order.status === "completed" && (
        <div className="rounded-xl border border-divider bg-ink-soft p-5 text-center">
          {order.alreadyReviewed ? (
            <p className="text-sm text-brand-green-bright">{t("review_thanks")}</p>
          ) : (
            <>
              <p className="mb-3 text-sm font-semibold">{t("review_prompt")}</p>
              <div className="mb-3 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} stars`}
                    className={`flex h-11 w-11 items-center justify-center text-2xl ${
                      n <= rating ? "text-brand-green-bright" : "text-text-on-ink-dim opacity-40"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t("review_comment_ph")}
                rows={3}
                className="mb-3 w-full rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
              />
              {reviewError && <p className="mb-2 text-xs text-brand-red">{reviewError}</p>}
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={rating === 0 || submitting}
                className="min-h-11 w-full rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
              >
                {submitting ? "…" : t("review_submit_btn")}
              </button>
            </>
          )}
        </div>
      )}

      <p className="text-center text-xs text-text-on-ink-dim">{t("track_polling_hint")}</p>
    </main>
  );
}
