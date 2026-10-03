"use client";

import { useLanguage } from "@/lib/i18n/context";

export default function PaidView({
  restaurantName,
  paid,
}: {
  restaurantName: string;
  paid: boolean;
}) {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <span className="text-4xl">{paid ? "✅" : "⚠️"}</span>
      <h1 className="font-display text-2xl font-bold">{restaurantName}</h1>
      {paid ? (
        <>
          <p className="text-sm font-semibold text-brand-green-bright">{t("paid_success_title")}</p>
          <p className="text-sm text-text-on-ink-dim">{t("paid_success_lead")}</p>
        </>
      ) : (
        <p className="text-sm text-brand-red">{t("paid_pending_lead")}</p>
      )}
    </main>
  );
}
