"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import type { HealthAlert } from "@/lib/health";

export default function Greeting({ alerts }: { alerts: HealthAlert[] }) {
  const { t } = useLanguage();
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    // Deliberately client-only: the greeting must reflect the viewer's
    // local time of day, not the server's, so this can't be computed
    // during SSR without risking a wrong "morning/evening" on hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHour(new Date().getHours());
  }, []);

  if (hour === null) return null;

  const greetWord =
    hour < 12 ? t("greeting_morning") : hour < 18 ? t("greeting_afternoon") : t("greeting_evening");

  const sub =
    alerts.length === 0
      ? t("greeting_all_good")
      : t("greeting_attention").replace("{count}", String(alerts.length));

  const firstAlertText = alerts[0]?.text.replace(/^🚨\s*/, "");

  return (
    <div className="rounded-xl border border-divider bg-brand-green-deep p-5">
      <div className="mb-1.5 text-base font-semibold">{greetWord} 👋 — {sub}</div>
      {alerts.length > 0 && (
        <div className="text-sm text-text-on-ink-dim">{firstAlertText}</div>
      )}
    </div>
  );
}
