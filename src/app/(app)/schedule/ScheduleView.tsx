"use client";

import { useActionState, useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import type { ForecastDayResult } from "@/lib/forecast";
import {
  detectLongShifts,
  detectMissingRestDay,
  detectShortRestPeriods,
  type MinijobCapFinding,
} from "@/lib/scheduleCompliance";
import { addShift, removeShift, type AddShiftState, type Shift } from "./actions";

const initialState: AddShiftState = {};

const WEEKDAY_KEYS = [
  "sched_mon",
  "sched_tue",
  "sched_wed",
  "sched_thu",
  "sched_fri",
  "sched_sat",
  "sched_sun",
] as const;

export default function ScheduleView({
  weekStart,
  staff,
  shifts: initialShifts,
  forecast,
  minijobFindings,
  country,
}: {
  weekStart: string;
  staff: { id: string; name: string }[];
  shifts: Shift[];
  forecast: ForecastDayResult[];
  minijobFindings: MinijobCapFinding[];
  country: CountryCode;
}) {
  const { t } = useLanguage();
  const [shifts, setShifts] = useState(initialShifts);
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(async (prev: AddShiftState, fd: FormData) => {
    const result = await addShift(prev, fd);
    if (!result.error) window.location.reload();
    return result;
  }, initialState);

  const days = useMemo(() => {
    const start = new Date(weekStart + "T00:00:00Z");
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [weekStart]);

  const commitRemove = useCallback(
    (s: Shift) => {
      setShifts((prev) => prev.filter((row) => row.id !== s.id));
      startTransition(() => {
        removeShift(s.id);
      });
    },
    [startTransition]
  );
  const {
    pending: pendingRemoval,
    scheduleRemove: scheduleShiftRemove,
    undo,
  } = useUndoableRemove(commitRemove);
  const visibleShifts = useMemo(
    () => shifts.filter((s) => s.id !== pendingRemoval?.id),
    [shifts, pendingRemoval]
  );

  const complianceInput = useMemo(
    () =>
      visibleShifts.map((s) => ({
        staffMemberId: s.staffMemberId,
        staffName: s.staffName,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      })),
    [visibleShifts]
  );
  const longShifts = useMemo(() => detectLongShifts(complianceInput), [complianceInput]);
  const shortRests = useMemo(() => detectShortRestPeriods(complianceInput), [complianceInput]);
  const missingRestDays = useMemo(() => detectMissingRestDay(complianceInput), [complianceInput]);
  const hasComplianceWarnings =
    longShifts.length > 0 ||
    shortRests.length > 0 ||
    missingRestDays.length > 0 ||
    minijobFindings.length > 0;

  const forecastByDate = useMemo(() => new Map(forecast.map((f) => [f.date, f])), [forecast]);

  if (staff.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold">{t("sched_title")}</h1>
        <p className="text-sm text-text-on-ink-dim">{t("sched_need_staff")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("sched_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("sched_lead")}</p>
      </div>

      <form
        action={formAction}
        className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5"
      >
        <select
          name="staffMemberId"
          required
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none"
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || "—"}
            </option>
          ))}
        </select>
        <select
          name="date"
          required
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none"
        >
          {days.map((d, i) => (
            <option key={d} value={d}>
              {t(WEEKDAY_KEYS[i])} · {d}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="time"
            name="startTime"
            required
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none"
          />
          <input
            type="time"
            name="endTime"
            required
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none"
          />
        </div>
        {state.error && <p className="text-sm text-brand-red">{t("sched_error")}</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {t("sched_add")}
        </button>
      </form>

      {hasComplianceWarnings && (
        <div className="flex flex-col gap-2 rounded-xl border border-brand-red/40 bg-brand-red/10 p-4">
          <h3 className="text-sm font-semibold text-brand-red">{t("sched_compliance_title")}</h3>
          {longShifts.map((f, i) => (
            <p key={`long-${i}`} className="text-xs">
              ⚠️ {f.staffName} · {f.date} — {t("sched_compliance_long_shift").replace("{hours}", String(f.hours))}
            </p>
          ))}
          {shortRests.map((f, i) => (
            <p key={`rest-${i}`} className="text-xs">
              ⚠️ {f.staffName} · {f.previousDate} → {f.date} —{" "}
              {t("sched_compliance_short_rest").replace("{hours}", String(f.restHours))}
            </p>
          ))}
          {missingRestDays.map((f, i) => (
            <p key={`consec-${i}`} className="text-xs">
              ⚠️ {f.staffName} —{" "}
              {t("sched_compliance_no_rest_day").replace("{days}", String(f.consecutiveDays))}
            </p>
          ))}
          {minijobFindings.map((f, i) => (
            <p key={`minijob-${i}`} className="text-xs">
              ⚠️ {f.staffName} —{" "}
              {t("sched_compliance_minijob")
                .replace("{amount}", fmtMoney(f.estimatedMonthlyEarnings, country))
                .replace("{cap}", fmtMoney(f.cap, country))}
            </p>
          ))}
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("sched_compliance_disclaimer")}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {days.map((d, i) => {
          const dayShifts = visibleShifts.filter((s) => s.date === d);
          const dayForecast = forecastByDate.get(d);
          return (
            <div key={d} className="rounded-xl border border-divider bg-ink-soft p-4">
              <div className="mb-2 flex items-baseline justify-between">
                <h3 className="text-xs font-medium text-text-on-ink-dim">
                  {t(WEEKDAY_KEYS[i])} · {d}
                </h3>
                {dayForecast?.avgRevenue != null && (
                  <span className="font-num text-[11px] text-brand-green-bright">
                    {t("sched_forecast_prefix")} {fmtMoney(dayForecast.avgRevenue, country)}
                  </span>
                )}
              </div>
              {dayShifts.length === 0 ? (
                <p className="text-xs text-text-on-ink-dim">{t("sched_no_shifts")}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {dayShifts.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-lg bg-ink px-3 py-2.5 text-sm"
                    >
                      <span>
                        {s.staffName || "—"}{" "}
                        <span className="font-num text-text-on-ink-dim">
                          {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => scheduleShiftRemove(s)}
                        aria-label="remove"
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <UndoToast
        visible={pendingRemoval !== null}
        label={t("undo_removed").replace("{name}", pendingRemoval?.staffName || "")}
        onUndo={undo}
      />
    </div>
  );
}
