"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { draftAiResponse, saveOwnerResponse, type Review } from "./actions";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="font-num text-sm text-brand-green-bright">
      {"★".repeat(rating)}
      <span className="text-text-on-ink-dim">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const { t, locale } = useLanguage();
  const [response, setResponse] = useState(review.ownerResponse ?? "");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDraft() {
    setDrafting(true);
    setError(null);
    const result = await draftAiResponse(review.id);
    setDrafting(false);
    if ("error" in result) {
      setError(
        result.error === "not_configured" ? t("reviews_ai_not_configured") : t("reviews_ai_error")
      );
      return;
    }
    setResponse(result.draft);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    await saveOwnerResponse(review.id, response);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-divider bg-ink-soft p-4">
      <div className="flex items-center justify-between">
        <Stars rating={review.rating} />
        <span className="text-xs text-text-on-ink-dim">
          {new Date(review.createdAt).toLocaleDateString(locale === "ar" ? "ar" : "de-DE")}
        </span>
      </div>
      {review.customerName && <p className="text-xs text-text-on-ink-dim">{review.customerName}</p>}
      {review.comment && <p className="text-sm">{review.comment}</p>}

      <div className="mt-2 flex flex-col gap-2">
        <textarea
          value={response}
          onChange={(e) => {
            setResponse(e.target.value);
            setSaved(false);
          }}
          placeholder={t("reviews_response_ph")}
          rows={3}
          className="rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        {error && <p className="text-xs text-brand-red">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDraft}
            disabled={drafting}
            className="min-h-11 flex-1 rounded-lg border border-divider px-3 text-xs font-semibold disabled:opacity-50"
          >
            {drafting ? "…" : t("reviews_ai_draft_btn")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || response.trim() === (review.ownerResponse ?? "")}
            className="min-h-11 flex-1 rounded-lg bg-brand-green-bright px-3 text-xs font-bold text-[#0A1F16] disabled:opacity-50"
          >
            {saving ? "…" : saved ? t("reviews_response_saved") : t("reviews_response_save_btn")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewsList({ initialReviews }: { initialReviews: Review[] }) {
  const { t } = useLanguage();

  const avgRating = useMemo(() => {
    if (initialReviews.length === 0) return 0;
    return (
      initialReviews.reduce((sum, r) => sum + r.rating, 0) / initialReviews.length
    );
  }, [initialReviews]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("reviews_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("reviews_lead")}</p>
      </div>

      {initialReviews.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-divider bg-ink-soft p-5">
          <span className="text-sm text-text-on-ink-dim">{t("reviews_avg_label")}</span>
          <span className="flex items-center gap-2">
            <span className="font-num text-xl font-bold text-brand-green-bright">
              {avgRating.toFixed(1)}
            </span>
            <Stars rating={Math.round(avgRating)} />
            <span className="text-xs text-text-on-ink-dim">
              ({initialReviews.length})
            </span>
          </span>
        </div>
      )}

      {initialReviews.length === 0 ? (
        <p className="text-sm text-text-on-ink-dim">{t("reviews_empty")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {initialReviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      <p className="text-center text-xs text-text-on-ink-dim">{t("reviews_disclaimer")}</p>
    </div>
  );
}
