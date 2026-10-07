"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { signOut } from "@/app/actions";
import { startSubscriptionCheckout } from "./actions";

export default function BillingView({
  restaurantName,
  subscriptionStatus,
  trialDaysLeft,
  isOwner,
}: {
  restaurantName: string;
  subscriptionStatus: "trialing" | "active" | "past_due" | "canceled";
  trialDaysLeft: number;
  isOwner: boolean;
}) {
  const { t } = useLanguage();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<"not_configured" | "generic" | null>(null);

  const trialRunning = subscriptionStatus === "trialing" && trialDaysLeft > 0;

  async function handleSubscribe() {
    setPending(true);
    setError(null);
    const result = await startSubscriptionCheckout();
    if (result.url) {
      window.location.href = result.url;
      return;
    }
    setError(result.error ?? "generic");
    setPending(false);
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">{restaurantName}</h1>
        {trialRunning ? (
          <p className="mt-2 text-sm text-text-on-ink-dim">
            {t("billing_trial_lead").replace("{days}", String(trialDaysLeft))}
          </p>
        ) : (
          <p className="mt-2 text-sm text-brand-red">{t("billing_expired_lead")}</p>
        )}
      </div>

      {isOwner ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-divider p-5">
          <p className="text-sm text-text-on-ink-dim">{t("billing_price_lead")}</p>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={pending}
            className="min-h-11 rounded-full bg-brand-green-bright px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
          >
            {pending ? "…" : t("billing_subscribe_btn")}
          </button>
          {error && (
            <p className="text-xs text-brand-red">
              {error === "not_configured" ? t("billing_not_configured") : t("billing_error")}
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-2xl border border-divider p-5 text-sm text-text-on-ink-dim">
          {t("billing_ask_owner")}
        </p>
      )}

      <form action={signOut}>
        <button
          type="submit"
          className="min-h-11 rounded-full border border-divider px-4 py-2 text-xs font-semibold text-text-on-ink-dim"
        >
          {t("nav_sign_out")}
        </button>
      </form>
    </main>
  );
}
