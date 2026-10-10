"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { createFranchiseBranch } from "./actions";

type Branch = { id: string; name: string; country: string };

export default function FranchiseView({ branches: initialBranches }: { branches: Branch[] }) {
  const { t, locale } = useLanguage();
  const [branches, setBranches] = useState(initialBranches);
  const [name, setName] = useState("");
  const [country, setCountry] = useState("de");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleCreate() {
    setPending(true);
    setError(null);
    setSuccess(false);
    const result = await createFranchiseBranch(name, country, locale, email);
    setPending(false);
    if (result.success) {
      setSuccess(true);
      setBranches((prev) => [...prev, { id: crypto.randomUUID(), name: name.trim(), country }]);
      setName("");
      setEmail("");
    } else {
      setError(
        result.error === "missing_name"
          ? t("franchise_error_missing_name")
          : result.error === "invite_failed"
            ? t("franchise_error_invite_failed")
            : t("franchise_error_generic")
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("franchise_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("franchise_lead")}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5">
        <h2 className="text-sm font-semibold">{t("franchise_create_title")}</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("franchise_name_ph")}
          maxLength={80}
          className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        >
          <option value="de">{t("country_de")}</option>
          <option value="uk">{t("country_uk")}</option>
          <option value="sa">{t("country_sa")}</option>
          <option value="ae">{t("country_ae")}</option>
        </select>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("franchise_invite_ph")}
          className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <p className="text-xs text-text-on-ink-dim">{t("franchise_invite_hint")}</p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending || !name.trim()}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {pending ? "…" : t("franchise_create_btn")}
        </button>
        {success && <p className="text-xs text-brand-green-bright">{t("franchise_create_success")}</p>}
        {error && <p className="text-xs text-brand-red">{error}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">{t("franchise_branches_title")}</h2>
        {branches.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("franchise_no_branches")}</p>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl border border-divider bg-ink-soft px-4 py-3 text-sm"
            >
              <span>{b.name}</span>
              <span className="text-text-on-ink-dim">{b.country.toUpperCase()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
