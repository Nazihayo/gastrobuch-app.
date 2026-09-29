"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
import { addExpense, removeExpense, updateExpense, type Expense } from "./actions";

export default function ExpensesList({
  country,
  initialExpenses,
}: {
  country: CountryCode;
  initialExpenses: Expense[];
}) {
  const { t } = useLanguage();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [, startTransition] = useTransition();

  const commitRemove = useCallback(
    (e: Expense) => {
      setExpenses((prev) => prev.filter((row) => row.id !== e.id));
      startTransition(() => {
        removeExpense(e.id, e.name);
      });
    },
    [startTransition]
  );
  const { pending, scheduleRemove, undo } = useUndoableRemove(commitRemove);
  const visibleExpenses = useMemo(
    () => expenses.filter((e) => e.id !== pending?.id),
    [expenses, pending]
  );

  const total = useMemo(
    () => visibleExpenses.reduce((sum, e) => sum + (e.amount || 0), 0),
    [visibleExpenses]
  );

  function patchLocal(id: string, patch: Partial<Expense>) {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function commit(id: string, patch: Partial<Expense>) {
    startTransition(() => {
      updateExpense(id, patch);
    });
  }

  async function handleAdd() {
    const created = await addExpense();
    if (created) setExpenses((prev) => [...prev, created]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/more" className="text-sm text-text-on-ink-dim">
          {t("back")}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t("exp_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("exp_lead")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {visibleExpenses.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">{t("exp_empty")}</p>
        )}
        {visibleExpenses.map((e) => (
          <div key={e.id} className="rounded-lg border border-divider bg-ink p-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                defaultValue={e.name}
                placeholder={t("exp_name_ph")}
                onChange={(ev) => patchLocal(e.id, { name: ev.target.value })}
                onBlur={(ev) => commit(e.id, { name: ev.target.value })}
                className="w-0 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              />
              <div className="flex min-h-11 items-center gap-1 rounded-md border border-divider bg-ink-soft px-2 py-1">
                <span className="text-xs text-text-on-ink-dim">
                  {COUNTRIES[country].currency}
                </span>
                <input
                  type="number"
                  defaultValue={e.amount}
                  onChange={(ev) =>
                    patchLocal(e.id, { amount: parseFloat(ev.target.value) || 0 })
                  }
                  onBlur={(ev) =>
                    commit(e.id, { amount: parseFloat(ev.target.value) || 0 })
                  }
                  className="w-20 bg-transparent text-right font-num text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => scheduleRemove(e)}
                aria-label="remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="min-h-11 rounded-lg border border-dashed border-divider py-3 text-sm text-text-on-ink-dim hover:text-text-on-ink"
      >
        {t("exp_add")}
      </button>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-brand-red">{t("exp_total")}</span>
          <span className="font-num font-bold text-brand-red">
            {fmtMoney(total, country)}
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("exp_disclaimer")}</p>

      <UndoToast
        visible={pending !== null}
        label={t("undo_removed").replace("{name}", pending?.name || "")}
        onUndo={undo}
      />
    </div>
  );
}
