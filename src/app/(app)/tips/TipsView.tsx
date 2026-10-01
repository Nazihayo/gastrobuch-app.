"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { fmtMoney, type CountryCode } from "@/lib/countries";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
import { distributeTips, type TipShift, type TipSplitMethod, type TipStaffMember } from "@/lib/tips";
import { buildTipPoolDatevExport, type DatevConfig } from "@/lib/datev";
import { saveTipPool, removeTipPool, type TipPoolHistoryEntry } from "./actions";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}

export default function TipsView({
  staff,
  shifts,
  country,
  datevConfig,
  history,
}: {
  staff: TipStaffMember[];
  shifts: TipShift[];
  country: CountryCode;
  datevConfig: DatevConfig;
  history: TipPoolHistoryEntry[];
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();
  const [periodStart, setPeriodStart] = useState(firstOfMonthIso());
  const [periodEnd, setPeriodEnd] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<TipSplitMethod>("hours");
  const [entries, setEntries] = useState(history);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const totalAmount = Number(amount) || 0;
  const preview = useMemo(
    () => distributeTips(staff, shifts, periodStart, periodEnd, totalAmount, method),
    [staff, shifts, periodStart, periodEnd, totalAmount, method]
  );

  const commitRemove = useCallback(
    (entry: TipPoolHistoryEntry) => {
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      startTransition(() => {
        removeTipPool(entry.id);
      });
    },
    [startTransition]
  );
  const { pending, scheduleRemove, undo } = useUndoableRemove(commitRemove);
  const visibleEntries = useMemo(
    () => entries.filter((e) => e.id !== pending?.id),
    [entries, pending]
  );

  async function handleSave() {
    if (preview.length === 0 || totalAmount <= 0) return;
    setSaving(true);
    setSaveMsg(null);
    const result = await saveTipPool(periodStart, periodEnd, totalAmount, method, preview);
    setSaving(false);
    if ("error" in result) {
      setSaveMsg(t("tips_save_error"));
      return;
    }
    setEntries((prev) => [
      {
        id: result.id,
        periodStart,
        periodEnd,
        totalAmount,
        splitMethod: method,
        createdAt: new Date().toISOString(),
        payouts: preview,
      },
      ...prev,
    ]);
    setAmount("");
    setSaveMsg(t("tips_save_done"));
  }

  function downloadDatev(entry: TipPoolHistoryEntry) {
    const csv = buildTipPoolDatevExport(
      entry.totalAmount,
      datevConfig,
      entry.periodStart,
      entry.periodEnd
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gastrobuch-trinkgeld-${entry.periodStart}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("tips_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("tips_lead")}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("tips_period_start")}>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          </Field>
          <Field label={t("tips_period_end")}>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          </Field>
        </div>

        <Field label={t("tips_amount_label")}>
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 font-num text-sm outline-none focus:border-brand-green-bright"
          />
        </Field>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMethod("hours")}
            className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${
              method === "hours"
                ? "border-brand-green-bright text-brand-green-bright"
                : "border-divider text-text-on-ink-dim"
            }`}
          >
            {t("tips_method_hours")}
          </button>
          <button
            type="button"
            onClick={() => setMethod("equal")}
            className={`min-h-11 flex-1 rounded-lg border px-3 text-sm font-medium ${
              method === "equal"
                ? "border-brand-green-bright text-brand-green-bright"
                : "border-divider text-text-on-ink-dim"
            }`}
          >
            {t("tips_method_equal")}
          </button>
        </div>

        {totalAmount > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-divider bg-ink p-3">
            {preview.length === 0 ? (
              <p className="text-sm text-text-on-ink-dim">{t("tips_preview_empty")}</p>
            ) : (
              preview.map((p) => (
                <div key={p.staffMemberId} className="flex items-baseline justify-between text-sm">
                  <span>
                    {p.staffName} <span className="text-text-on-ink-dim">· {p.hours}h</span>
                  </span>
                  <span className="font-num font-semibold text-brand-green-bright">
                    {fmtMoney(p.amount, country)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || preview.length === 0 || totalAmount <= 0}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {saving ? "…" : t("tips_save_btn")}
        </button>
        {saveMsg && <p className="text-center text-xs text-text-on-ink-dim">{saveMsg}</p>}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">{t("tips_history_title")}</h2>
        {visibleEntries.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("tips_history_empty")}</p>
        ) : (
          visibleEntries.map((entry) => (
            <div key={entry.id} className="rounded-xl border border-divider bg-ink-soft p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {entry.periodStart} – {entry.periodEnd}
                </span>
                <span className="font-num text-sm font-bold text-brand-green-bright">
                  {fmtMoney(entry.totalAmount, country)}
                </span>
              </div>
              <div className="mb-3 flex flex-col gap-1">
                {entry.payouts.map((p) => (
                  <div
                    key={p.staffMemberId || p.staffName}
                    className="flex justify-between text-xs text-text-on-ink-dim"
                  >
                    <span>
                      {p.staffName} · {p.hours}h
                    </span>
                    <span className="font-num">{fmtMoney(p.amount, country)}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadDatev(entry)}
                  className="min-h-11 flex-1 rounded-lg border border-divider px-3 text-xs font-semibold"
                >
                  {t("tips_datev_export_btn")}
                </button>
                <button
                  type="button"
                  onClick={() => scheduleRemove(entry)}
                  aria-label="remove"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-divider text-text-on-ink-dim hover:text-brand-red"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-center text-xs text-brand-red">{t("tips_datev_disclaimer")}</p>

      <UndoToast
        visible={pending !== null}
        label={t("undo_removed").replace("{name}", pending?.periodStart || "")}
        onUndo={undo}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-text-on-ink-dim">{label}</label>
      {children}
    </div>
  );
}
