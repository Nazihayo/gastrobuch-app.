"use client";

import { useActionState, useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
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
}: {
  weekStart: string;
  staff: { id: string; name: string }[];
  shifts: Shift[];
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

      <div className="flex flex-col gap-3">
        {days.map((d, i) => {
          const dayShifts = visibleShifts.filter((s) => s.date === d);
          return (
            <div key={d} className="rounded-xl border border-divider bg-ink-soft p-4">
              <h3 className="mb-2 text-xs font-medium text-text-on-ink-dim">
                {t(WEEKDAY_KEYS[i])} · {d}
              </h3>
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
