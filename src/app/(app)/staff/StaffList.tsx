"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
import {
  addStaffMember,
  removeStaffMember,
  updateStaffMember,
  type StaffMember,
} from "./actions";

export default function StaffList({
  country,
  initialStaff,
}: {
  country: CountryCode;
  initialStaff: StaffMember[];
}) {
  const { t, locale } = useLanguage();
  const [staff, setStaff] = useState<StaffMember[]>(initialStaff);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const conf = COUNTRIES[country];
  const minijobLimit = conf.minijob;

  const commitRemove = useCallback(
    (s: StaffMember) => {
      setStaff((prev) => prev.filter((row) => row.id !== s.id));
      startTransition(() => {
        removeStaffMember(s.id, s.name);
      });
    },
    [startTransition]
  );
  const { pending, scheduleRemove, undo } = useUndoableRemove(commitRemove);
  const visibleStaff = useMemo(
    () => staff.filter((s) => s.id !== pending?.id),
    [staff, pending]
  );

  const { totalHours, totalWages, anyOverMinijob } = useMemo(() => {
    let hours = 0;
    let wages = 0;
    let over = false;
    for (const s of visibleStaff) {
      hours += s.hours || 0;
      const wage = (s.hours || 0) * (s.rate || 0);
      wages += wage;
      if (minijobLimit && wage > minijobLimit) over = true;
    }
    return { totalHours: hours, totalWages: wages, anyOverMinijob: over };
  }, [visibleStaff, minijobLimit]);

  const searchedStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleStaff;
    return visibleStaff.filter((s) => s.name.toLowerCase().includes(q));
  }, [visibleStaff, query]);

  function patchLocal(id: string, patch: Partial<StaffMember>) {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function commit(id: string, patch: Partial<StaffMember>) {
    startTransition(() => {
      updateStaffMember(id, patch);
    });
  }

  async function handleAdd() {
    const created = await addStaffMember();
    if (created) setStaff((prev) => [...prev, created]);
  }

  const lead = minijobLimit
    ? t("staff_lead_with_minijob").replace(
        "{limit}",
        `${minijobLimit} ${conf.currency}`
      )
    : t("staff_lead_plain");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("staff_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{lead}</p>
      </div>

      {visibleStaff.length > 5 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("staff_search_ph")}
          className="min-h-11 rounded-lg border border-divider bg-ink-soft px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
      )}

      <div className="flex flex-col gap-3">
        {searchedStaff.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">
            {visibleStaff.length === 0 ? t("staff_empty") : t("cust_no_match")}
          </p>
        )}
        {searchedStaff.map((s) => {
          const wage = (s.hours || 0) * (s.rate || 0);
          const warn = Boolean(minijobLimit && wage > minijobLimit);
          return (
            <div
              key={s.id}
              className={`rounded-lg border bg-ink p-3 ${
                warn ? "border-brand-red" : "border-divider"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={s.name}
                  placeholder={t("staff_name_ph")}
                  onChange={(e) => patchLocal(s.id, { name: e.target.value })}
                  onBlur={(e) => commit(s.id, { name: e.target.value })}
                  className="w-0 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <button
                  type="button"
                  onClick={() => scheduleRemove(s)}
                  aria-label="remove"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="min-h-11 rounded-md bg-ink-soft px-2 py-1.5 text-center">
                  <label className="block text-[9.5px] text-text-on-ink-dim">
                    {t("staff_hours")}
                  </label>
                  <input
                    type="number"
                    defaultValue={s.hours}
                    onChange={(e) =>
                      patchLocal(s.id, { hours: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      commit(s.id, { hours: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-center font-num text-sm outline-none"
                  />
                </div>
                <div className="min-h-11 rounded-md bg-ink-soft px-2 py-1.5 text-center">
                  <label className="block text-[9.5px] text-text-on-ink-dim">
                    {conf.currency}
                    {t("staff_rate")}
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    defaultValue={s.rate}
                    onChange={(e) =>
                      patchLocal(s.id, { rate: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      commit(s.id, { rate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-center font-num text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="min-h-11 rounded-lg border border-dashed border-divider py-3 text-sm text-text-on-ink-dim hover:text-text-on-ink"
      >
        {t("staff_add")}
      </button>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <Row label={t("staff_count")} value={String(visibleStaff.length)} />
        <Row
          label={t("staff_hours_total")}
          value={totalHours.toLocaleString(locale === "ar" ? "ar" : "de-DE")}
        />
        <Row
          label={t("staff_wages_total")}
          value={fmtMoney(totalWages, country)}
          last
          className="text-brand-red"
        />
      </div>

      {anyOverMinijob && (
        <p className="rounded-lg bg-[rgba(192,85,74,0.12)] p-3 text-sm text-brand-red">
          {t("staff_minijob_warn")}
        </p>
      )}

      <p className="text-center text-xs text-text-on-ink-dim">
        {t("staff_disclaimer")}
      </p>

      <UndoToast
        visible={pending !== null}
        label={t("undo_removed").replace("{name}", pending?.name || "")}
        onUndo={undo}
      />
    </div>
  );
}

function Row({
  label,
  value,
  className = "",
  last = false,
}: {
  label: string;
  value: string;
  className?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between py-2 text-sm text-text-on-ink-dim ${
        last ? "" : "border-b border-divider"
      }`}
    >
      <span>{label}</span>
      <span className={`font-num ${className || "text-text-on-ink"}`}>{value}</span>
    </div>
  );
}
