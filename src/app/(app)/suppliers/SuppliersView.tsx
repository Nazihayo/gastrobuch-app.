"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { addSupplier, removeSupplier, setSupplierPrice, toggleAutoReorder } from "./actions";

type Supplier = { id: string; name: string; email: string };
type Item = { id: string; name: string; unit: string };
type Price = { supplier_id: string; inventory_item_id: string; price: number; reorder_quantity: number };

export default function SuppliersView({
  suppliers: initialSuppliers,
  items,
  prices: initialPrices,
  autoReorderEnabled: initialAutoReorder,
}: {
  suppliers: Supplier[];
  items: Item[];
  prices: Price[];
  autoReorderEnabled: boolean;
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [prices, setPrices] = useState(initialPrices);
  const [autoReorder, setAutoReorder] = useState(initialAutoReorder);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  function handleAddSupplier() {
    if (!name.trim()) return;
    startTransition(async () => {
      await addSupplier(name, email);
    });
    setSuppliers((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), email: email.trim() }]);
    setName("");
    setEmail("");
  }

  function handleRemoveSupplier(id: string) {
    setSuppliers((prev) => prev.filter((s) => s.id !== id));
    startTransition(() => {
      removeSupplier(id);
    });
  }

  function handleToggleAutoReorder() {
    const next = !autoReorder;
    setAutoReorder(next);
    startTransition(() => {
      toggleAutoReorder(next);
    });
  }

  function priceFor(supplierId: string, itemId: string): Price | undefined {
    return prices.find((p) => p.supplier_id === supplierId && p.inventory_item_id === itemId);
  }

  function handlePriceChange(supplierId: string, itemId: string, field: "price" | "reorder_quantity", value: number) {
    setPrices((prev) => {
      const existing = prev.find((p) => p.supplier_id === supplierId && p.inventory_item_id === itemId);
      if (existing) {
        return prev.map((p) =>
          p === existing ? { ...p, [field]: value } : p
        );
      }
      return [
        ...prev,
        {
          supplier_id: supplierId,
          inventory_item_id: itemId,
          price: field === "price" ? value : 0,
          reorder_quantity: field === "reorder_quantity" ? value : 0,
        },
      ];
    });
  }

  function commitPrice(supplierId: string, itemId: string) {
    const p = priceFor(supplierId, itemId);
    startTransition(() => {
      setSupplierPrice(supplierId, itemId, p?.price ?? 0, p?.reorder_quantity ?? 0);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("suppliers_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("suppliers_lead")}</p>
      </div>

      <button
        type="button"
        onClick={handleToggleAutoReorder}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold ${
          autoReorder
            ? "border-brand-green-bright bg-brand-green-bright/10 text-brand-green-bright"
            : "border-divider text-text-on-ink-dim"
        }`}
      >
        {autoReorder ? "✅" : "⬜️"} {t("suppliers_auto_reorder_toggle")}
      </button>
      <p className="text-xs text-text-on-ink-dim">{t("suppliers_auto_reorder_hint")}</p>

      <div className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5">
        <h2 className="text-sm font-semibold">{t("suppliers_add_title")}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("suppliers_name_ph")}
          className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("suppliers_email_ph")}
          className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <button
          type="button"
          onClick={handleAddSupplier}
          disabled={!name.trim()}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {t("suppliers_add_btn")}
        </button>
      </div>

      {suppliers.length === 0 ? (
        <p className="text-sm text-text-on-ink-dim">{t("suppliers_empty")}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-on-ink-dim">{t("suppliers_no_items")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="rounded-xl border border-divider bg-ink-soft p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{s.name}</h3>
                  <p className="text-xs text-text-on-ink-dim">{s.email || "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSupplier(s.id)}
                  className="text-xs text-text-on-ink-dim hover:text-brand-red"
                >
                  {t("suppliers_remove")}
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const p = priceFor(s.id, item.id);
                  return (
                    <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_80px_80px] items-center gap-2">
                      <span className="truncate text-xs text-text-on-ink-dim">
                        {item.name} ({item.unit})
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p?.price || ""}
                        placeholder={t("suppliers_price_ph")}
                        onBlur={(e) => {
                          handlePriceChange(s.id, item.id, "price", Number(e.target.value) || 0);
                          commitPrice(s.id, item.id);
                        }}
                        className="min-h-9 rounded-md border border-divider bg-ink px-2 py-1 text-xs outline-none"
                      />
                      <input
                        type="number"
                        step="0.01"
                        defaultValue={p?.reorder_quantity || ""}
                        placeholder={t("suppliers_qty_ph")}
                        onBlur={(e) => {
                          handlePriceChange(s.id, item.id, "reorder_quantity", Number(e.target.value) || 0);
                          commitPrice(s.id, item.id);
                        }}
                        className="min-h-9 rounded-md border border-divider bg-ink px-2 py-1 text-xs outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
