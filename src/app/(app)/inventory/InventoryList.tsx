"use client";

import { useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import {
  addInventoryItem,
  removeInventoryItem,
  updateInventoryItem,
  type InventoryItem,
} from "./actions";

export default function InventoryList({
  initialItems,
}: {
  initialItems: InventoryItem[];
}) {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [, startTransition] = useTransition();

  const needOrderCount = useMemo(
    () => items.filter((it) => Math.max((it.needed || 0) - (it.remaining || 0), 0) > 0).length,
    [items]
  );

  function patchLocal(id: string, patch: Partial<InventoryItem>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function commit(id: string, patch: Partial<InventoryItem>) {
    startTransition(() => {
      updateInventoryItem(id, patch);
    });
  }

  async function handleAdd() {
    const created = await addInventoryItem();
    if (created) setItems((prev) => [...prev, created]);
  }

  function handleRemove(item: InventoryItem) {
    setItems((prev) => prev.filter((row) => row.id !== item.id));
    startTransition(() => {
      removeInventoryItem(item.id, item.name);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("inv_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("inv_lead")}</p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5 text-center">
        <span className="font-num text-3xl font-bold">{needOrderCount}</span>
        <p className="mt-1 text-xs text-text-on-ink-dim">{t("inv_summary_label")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {items.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">{t("inv_empty")}</p>
        )}
        {items.map((item) => {
          const order = Math.max((item.needed || 0) - (item.remaining || 0), 0);
          const warn = order > 0;
          return (
            <div
              key={item.id}
              className={`rounded-lg border bg-ink p-3 ${
                warn ? "border-brand-red" : "border-divider"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <input
                  type="text"
                  defaultValue={item.name}
                  placeholder={t("inv_name_ph")}
                  onChange={(e) => patchLocal(item.id, { name: e.target.value })}
                  onBlur={(e) => commit(item.id, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium outline-none"
                />
                <input
                  type="text"
                  defaultValue={item.unit}
                  onChange={(e) => patchLocal(item.id, { unit: e.target.value })}
                  onBlur={(e) => commit(item.id, { unit: e.target.value })}
                  className="w-14 bg-transparent text-center text-xs text-text-on-ink-dim outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(item)}
                  aria-label="remove"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="min-h-11 rounded-md bg-ink-soft px-2 py-1.5 text-center">
                  <label className="block text-[9.5px] text-text-on-ink-dim">
                    {t("inv_needed")}
                  </label>
                  <input
                    type="number"
                    defaultValue={item.needed}
                    onChange={(e) =>
                      patchLocal(item.id, { needed: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      commit(item.id, { needed: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-center font-num text-sm outline-none"
                  />
                </div>
                <div className="min-h-11 rounded-md bg-ink-soft px-2 py-1.5 text-center">
                  <label className="block text-[9.5px] text-text-on-ink-dim">
                    {t("inv_remaining")}
                  </label>
                  <input
                    type="number"
                    defaultValue={item.remaining}
                    onChange={(e) =>
                      patchLocal(item.id, { remaining: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      commit(item.id, { remaining: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-center font-num text-sm outline-none"
                  />
                </div>
                <div
                  className={`rounded-md px-2 py-1.5 text-center ${
                    warn ? "bg-[rgba(192,85,74,0.18)]" : "bg-[rgba(31,107,77,0.18)]"
                  }`}
                >
                  <label className="block text-[9.5px] text-text-on-ink-dim">
                    {t("inv_order")}
                  </label>
                  <span
                    className={`font-num text-sm font-bold ${
                      warn ? "text-brand-red" : "text-brand-green-bright"
                    }`}
                  >
                    {order.toLocaleString(locale === "ar" ? "ar" : "de-DE")}
                  </span>
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
        {t("inv_add")}
      </button>

      <p className="text-center text-xs text-text-on-ink-dim">{t("inv_disclaimer")}</p>
    </div>
  );
}
