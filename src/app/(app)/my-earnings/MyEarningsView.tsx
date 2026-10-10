"use client";

import { useEffect, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { shiftElapsedHours, shiftLengthHours } from "@/lib/staffEarnings";
import { claimStaffMember } from "./actions";

export type UnclaimedStaff = { id: string; name: string };
export type TodayShift = { startTime: string; endTime: string };
export type RecentPayout = {
  periodStart: string;
  periodEnd: string;
  poolTotal: number;
  splitMethod: "hours" | "equal";
  hours: number;
  amount: number;
};

export default function MyEarningsView({
  claimed,
  unclaimed,
  todayShift,
  tipPerHour,
  recentPayout,
}: {
  claimed: { name: string; rate: number } | null;
  unclaimed: UnclaimedStaff[];
  todayShift?: TodayShift | null;
  tipPerHour?: number;
  recentPayout?: RecentPayout | null;
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  function handleClaim(id: string) {
    setClaiming(id);
    startTransition(async () => {
      await claimStaffMember(id);
      setClaiming(null);
    });
  }

  if (!claimed) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("my_earnings_title")}</h1>
          <p className="mt-1 text-sm text-text-on-ink-dim">{t("my_earnings_claim_lead")}</p>
        </div>
        {unclaimed.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("my_earnings_claim_empty")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {unclaimed.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={claiming !== null}
                onClick={() => handleClaim(s.id)}
                className="flex min-h-11 items-center justify-between rounded-xl border border-divider bg-ink-soft px-5 py-4 text-sm font-medium disabled:opacity-50"
              >
                <span>{s.name}</span>
                <span className="text-xs font-semibold text-brand-green-bright">
                  {claiming === s.id ? "…" : t("my_earnings_claim_btn")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const elapsedHours = todayShift ? shiftElapsedHours(todayShift.startTime, todayShift.endTime, now) : 0;
  const shiftLength = todayShift ? shiftLengthHours(todayShift.startTime, todayShift.endTime) : 0;
  const baseWage = Math.round(elapsedHours * claimed.rate * 100) / 100;
  const estimatedTips = Math.round(elapsedHours * (tipPerHour ?? 0) * 100) / 100;
  const isOngoing = todayShift && elapsedHours > 0 && elapsedHours < shiftLength;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("my_earnings_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">
          {t("my_earnings_greeting")} {claimed.name}
        </p>
      </div>

      {!todayShift ? (
        <p className="rounded-xl border border-divider bg-ink-soft p-5 text-sm text-text-on-ink-dim">
          {t("my_earnings_no_shift")}
        </p>
      ) : (
        <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">{t("my_earnings_shift_title")}</h2>
            {isOngoing && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-green-bright">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green-bright" />
                {t("my_earnings_live")}
              </span>
            )}
          </div>
          <p className="text-xs text-text-on-ink-dim">
            {todayShift.startTime}–{todayShift.endTime} · {t("my_earnings_elapsed")}: {elapsedHours.toFixed(2)}h
          </p>

          <div className="flex flex-col gap-1">
            <span className="text-xs text-text-on-ink-dim">{t("my_earnings_base_wage")}</span>
            <span className="font-display text-3xl font-bold">{baseWage.toFixed(2)}€</span>
          </div>

          <div className="flex flex-col gap-1 rounded-lg border border-divider bg-ink p-3">
            <span className="text-xs text-text-on-ink-dim">
              {t("my_earnings_estimated_tips")} · {t("my_earnings_estimate_disclaimer")}
            </span>
            <span className="font-display text-xl font-bold text-brand-green-bright">
              +{estimatedTips.toFixed(2)}€
            </span>
            <span className="text-xs text-text-on-ink-dim">
              {(tipPerHour ?? 0).toFixed(2)}€ {t("my_earnings_per_hour_avg")}
            </span>
          </div>
        </div>
      )}

      {recentPayout && (
        <div className="flex flex-col gap-2 rounded-xl border border-divider bg-ink-soft p-5">
          <h2 className="text-sm font-semibold">{t("my_earnings_recent_payout_title")}</h2>
          <p className="text-xs text-text-on-ink-dim">
            {recentPayout.periodStart} – {recentPayout.periodEnd}
          </p>
          <p className="text-xs text-text-on-ink-dim">
            {t("my_earnings_recent_payout_breakdown")
              .replace("{hours}", recentPayout.hours.toFixed(2))
              .replace("{total}", recentPayout.poolTotal.toFixed(2))
              .replace(
                "{method}",
                recentPayout.splitMethod === "hours" ? t("tips_method_hours") : t("tips_method_equal")
              )}
          </p>
          <span className="font-display text-lg font-bold">{recentPayout.amount.toFixed(2)}€</span>
        </div>
      )}
    </div>
  );
}
