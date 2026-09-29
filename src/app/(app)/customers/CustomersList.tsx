"use client";

import { useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { addCustomer, removeCustomer, updateCustomer, type Customer } from "./actions";

export default function CustomersList({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
    );
  }, [customers, query]);

  function patchLocal(id: string, patch: Partial<Customer>) {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function commit(id: string, patch: Partial<Customer>) {
    startTransition(() => {
      updateCustomer(id, patch);
    });
  }

  async function handleAdd() {
    const created = await addCustomer();
    if (created) setCustomers((prev) => [created, ...prev]);
  }

  function handleRemove(c: Customer) {
    setCustomers((prev) => prev.filter((row) => row.id !== c.id));
    startTransition(() => {
      removeCustomer(c.id, c.name);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("cust_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("cust_lead")}</p>
      </div>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("cust_search_ph")}
        className="min-h-11 rounded-lg border border-divider bg-ink-soft px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
      />

      <button
        type="button"
        onClick={handleAdd}
        className="min-h-11 rounded-lg border border-dashed border-divider py-3 text-sm text-text-on-ink-dim hover:text-text-on-ink"
      >
        {t("cust_add")}
      </button>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 && (
          <p className="text-sm text-text-on-ink-dim">
            {customers.length === 0 ? t("cust_empty") : t("cust_no_match")}
          </p>
        )}
        {filtered.map((c) => (
          <div key={c.id} className="rounded-lg border border-divider bg-ink p-3">
            <div className="mb-2 flex items-center gap-2">
              <input
                type="text"
                defaultValue={c.name}
                placeholder={t("cust_name_ph")}
                onChange={(e) => patchLocal(c.id, { name: e.target.value })}
                onBlur={(e) => commit(c.id, { name: e.target.value })}
                className="min-h-11 flex-1 bg-transparent text-sm font-medium outline-none"
              />
              <button
                type="button"
                onClick={() => handleRemove(c)}
                aria-label="remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="tel"
                defaultValue={c.phone}
                placeholder={t("cust_phone_ph")}
                onChange={(e) => patchLocal(c.id, { phone: e.target.value })}
                onBlur={(e) => commit(c.id, { phone: e.target.value })}
                className="min-h-11 rounded-md bg-ink-soft px-2.5 py-1.5 font-num text-sm outline-none"
              />
              <input
                type="text"
                defaultValue={c.address}
                placeholder={t("cust_address_ph")}
                onChange={(e) => patchLocal(c.id, { address: e.target.value })}
                onBlur={(e) => commit(c.id, { address: e.target.value })}
                className="min-h-11 rounded-md bg-ink-soft px-2.5 py-1.5 text-sm outline-none"
              />
              <input
                type="text"
                defaultValue={c.notes}
                placeholder={t("cust_notes_ph")}
                onChange={(e) => patchLocal(c.id, { notes: e.target.value })}
                onBlur={(e) => commit(c.id, { notes: e.target.value })}
                className="min-h-11 rounded-md bg-ink-soft px-2.5 py-1.5 text-xs text-text-on-ink-dim outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("cust_disclaimer")}</p>
    </div>
  );
}
