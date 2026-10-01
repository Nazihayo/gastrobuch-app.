"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { createClient } from "@/lib/supabase/client";
import {
  addLoyaltyTier,
  removeLoyaltyTier,
  removeLogo,
  updateLoyaltyTier,
  updateRestaurantProfile,
  uploadLogo,
  type LoyaltyTier,
} from "./actions";

export default function ProfileForm({
  name,
  logoUrl: initialLogoUrl,
  country,
  phone,
  address,
  taxId,
  datevKontoFood,
  datevKontoDrink,
  datevKontoWages,
  datevKontoExpenses,
  datevKontoBank,
  datevBeraterNr,
  datevMandantNr,
  whatsappNumber,
  loyaltyTiers,
  tableCount,
  tableQrCodes,
  hasMenuItems,
  menuUrl,
  menuQrDataUrl,
}: {
  name: string;
  logoUrl: string | null;
  country: CountryCode;
  phone: string;
  address: string;
  taxId: string;
  datevKontoFood: string;
  datevKontoDrink: string;
  datevKontoWages: string;
  datevKontoExpenses: string;
  datevKontoBank: string;
  datevBeraterNr: string;
  datevMandantNr: string;
  whatsappNumber: string;
  loyaltyTiers: LoyaltyTier[];
  tableCount: number;
  tableQrCodes: { number: number; qrDataUrl: string }[];
  hasMenuItems: boolean;
  menuUrl: string;
  menuQrDataUrl: string | null;
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [tiers, setTiers] = useState(loyaltyTiers);
  const conf = COUNTRIES[country];

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(menuUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access can be denied by the browser; nothing to recover
    }
  }

  function commit(patch: Parameters<typeof updateRestaurantProfile>[0]) {
    startTransition(() => {
      updateRestaurantProfile(patch);
    });
  }

  async function handleLogoChange(file: File | undefined) {
    if (!file) return;
    setLogoError(null);
    const formData = new FormData();
    formData.set("logo", file);
    const result = await uploadLogo(formData);
    if (result.error) {
      setLogoError(
        result.error === "too_large"
          ? t("profile_logo_too_large")
          : result.error === "not_image"
            ? t("profile_logo_not_image")
            : t("profile_logo_error")
      );
      return;
    }
    if (result.path) {
      const supabase = createClient();
      setLogoUrl(supabase.storage.from("menu-photos").getPublicUrl(result.path).data.publicUrl);
    }
  }

  function handleRemoveLogo() {
    setLogoUrl(null);
    startTransition(() => {
      removeLogo();
    });
  }

  async function handleAddTier() {
    const tier = await addLoyaltyTier();
    if (tier) setTiers((prev) => [...prev, tier].sort((a, b) => a.threshold - b.threshold));
  }

  function handleTierChange(id: string, patch: Partial<Pick<LoyaltyTier, "name" | "threshold" | "reward">>) {
    setTiers((prev) => prev.map((tr) => (tr.id === id ? { ...tr, ...patch } : tr)));
    startTransition(() => {
      updateLoyaltyTier(id, patch);
    });
  }

  function handleRemoveTier(id: string) {
    setTiers((prev) => prev.filter((tr) => tr.id !== id));
    startTransition(() => {
      removeLoyaltyTier(id);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("profile_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("profile_lead")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- a public Supabase Storage URL, not something Next's optimizer can process */}
              <img
                src={logoUrl}
                alt={name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full border border-divider object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveLogo}
                aria-label="remove logo"
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            </div>
          ) : (
            <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-full border border-dashed border-divider text-center text-[10px] text-text-on-ink-dim hover:text-text-on-ink">
              📷 {t("profile_logo_add")}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleLogoChange(e.target.files?.[0])}
              />
            </label>
          )}
          <p className="text-xs text-text-on-ink-dim">{t("profile_logo_hint")}</p>
        </div>
        {logoError && <p className="text-xs text-brand-red">{logoError}</p>}

        <Field label={t("profile_name")}>
          <TextInput defaultValue={name} onCommit={(v) => commit({ name: v })} />
        </Field>
        <Field label={t("profile_country_label")}>
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-divider bg-ink px-3 text-sm text-text-on-ink-dim">
            <span>{conf.flag}</span>
            <span>{t(`country_${country}` as const)}</span>
          </div>
        </Field>
        <Field label={t("profile_phone")}>
          <TextInput
            type="tel"
            defaultValue={phone}
            placeholder={t("profile_phone_ph")}
            onCommit={(v) => commit({ phone: v })}
          />
        </Field>
        <Field label={t("profile_address")}>
          <TextInput
            defaultValue={address}
            placeholder={t("profile_address_ph")}
            onCommit={(v) => commit({ address: v })}
          />
        </Field>
        <Field label={t("profile_tax_id")}>
          <TextInput
            defaultValue={taxId}
            placeholder={t("profile_tax_id_ph")}
            onCommit={(v) => commit({ taxId: v })}
          />
        </Field>
        <Field label={t("profile_whatsapp_label")}>
          <TextInput
            type="tel"
            defaultValue={whatsappNumber}
            placeholder={t("profile_whatsapp_ph")}
            onCommit={(v) => commit({ whatsappNumber: v })}
          />
        </Field>
        <p className="text-xs text-text-on-ink-dim">{t("profile_whatsapp_hint")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <div>
          <h2 className="text-sm font-semibold">{t("profile_datev_title")}</h2>
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("profile_datev_lead")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile_datev_food")}>
            <TextInput
              defaultValue={datevKontoFood}
              onCommit={(v) => commit({ datevKontoFood: v })}
            />
          </Field>
          <Field label={t("profile_datev_drink")}>
            <TextInput
              defaultValue={datevKontoDrink}
              onCommit={(v) => commit({ datevKontoDrink: v })}
            />
          </Field>
          <Field label={t("profile_datev_wages")}>
            <TextInput
              defaultValue={datevKontoWages}
              onCommit={(v) => commit({ datevKontoWages: v })}
            />
          </Field>
          <Field label={t("profile_datev_expenses")}>
            <TextInput
              defaultValue={datevKontoExpenses}
              onCommit={(v) => commit({ datevKontoExpenses: v })}
            />
          </Field>
          <Field label={t("profile_datev_bank")}>
            <TextInput
              defaultValue={datevKontoBank}
              onCommit={(v) => commit({ datevKontoBank: v })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("profile_datev_berater")}>
            <TextInput
              defaultValue={datevBeraterNr}
              onCommit={(v) => commit({ datevBeraterNr: v })}
            />
          </Field>
          <Field label={t("profile_datev_mandant")}>
            <TextInput
              defaultValue={datevMandantNr}
              onCommit={(v) => commit({ datevMandantNr: v })}
            />
          </Field>
        </div>
        <p className="text-xs text-brand-red">{t("profile_datev_disclaimer")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <div>
          <h2 className="text-sm font-semibold">{t("profile_loyalty_title")}</h2>
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("profile_loyalty_lead")}</p>
        </div>
        {tiers.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("profile_loyalty_empty")}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex flex-col gap-3 rounded-lg border border-divider bg-ink p-3"
              >
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("profile_loyalty_tier_name")}>
                    <TextInput
                      defaultValue={tier.name}
                      placeholder={t("profile_loyalty_tier_name_ph")}
                      onCommit={(v) => handleTierChange(tier.id, { name: v })}
                    />
                  </Field>
                  <Field label={t("profile_loyalty_tier_threshold")}>
                    <input
                      type="number"
                      min={1}
                      defaultValue={tier.threshold}
                      onBlur={(e) =>
                        handleTierChange(tier.id, {
                          threshold: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="min-h-11 rounded-lg border border-divider bg-ink-soft px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
                    />
                  </Field>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label={t("profile_loyalty_reward")}>
                      <TextInput
                        defaultValue={tier.reward}
                        placeholder={t("profile_loyalty_reward_ph")}
                        onCommit={(v) => handleTierChange(tier.id, { reward: v })}
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(tier.id)}
                    aria-label="remove tier"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-divider text-text-on-ink-dim hover:text-brand-red"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={handleAddTier}
          className="min-h-11 rounded-lg border border-dashed border-divider text-sm font-semibold text-text-on-ink-dim hover:text-text-on-ink"
        >
          {t("profile_loyalty_add_tier")}
        </button>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-xl border border-divider bg-ink-soft p-5 text-center">
        <div>
          <h2 className="text-sm font-semibold">{t("profile_menu_title")}</h2>
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("profile_menu_lead")}</p>
        </div>
        {menuQrDataUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URI, not a remote image Next's optimizer can process */}
            <img
              src={menuQrDataUrl}
              alt={t("profile_menu_title")}
              width={180}
              height={180}
              className="rounded-lg bg-white p-2"
            />
            <div className="flex w-full gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="min-h-11 flex-1 rounded-lg border border-divider px-3 text-sm font-semibold"
              >
                {copied ? t("profile_menu_copied") : t("profile_menu_copy")}
              </button>
              <a
                href={menuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg bg-brand-green-bright px-3 text-sm font-semibold text-[#0A1F16]"
              >
                {t("profile_menu_open")}
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-text-on-ink-dim">{t("profile_menu_empty")}</p>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
        <div>
          <h2 className="text-sm font-semibold">{t("profile_tables_title")}</h2>
          <p className="mt-1 text-xs text-text-on-ink-dim">{t("profile_tables_lead")}</p>
        </div>
        <Field label={t("profile_tables_count")}>
          <input
            type="number"
            min={0}
            max={200}
            defaultValue={tableCount}
            onBlur={(e) =>
              commit({ tableCount: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })
            }
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
        </Field>
        {!hasMenuItems ? (
          <p className="text-sm text-text-on-ink-dim">{t("profile_menu_empty")}</p>
        ) : tableQrCodes.length === 0 ? (
          <p className="text-sm text-text-on-ink-dim">{t("profile_tables_empty")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {tableQrCodes.map((tq) => (
              <div key={tq.number} className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URI, not a remote image Next's optimizer can process */}
                <img
                  src={tq.qrDataUrl}
                  alt={`${t("table_label")} ${tq.number}`}
                  width={90}
                  height={90}
                  className="rounded-lg bg-white p-1"
                />
                <span className="text-xs text-text-on-ink-dim">
                  {t("table_label")} {tq.number}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("profile_disclaimer")}</p>
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

function TextInput({
  defaultValue,
  placeholder,
  type = "text",
  onCommit,
}: {
  defaultValue: string;
  placeholder?: string;
  type?: string;
  onCommit: (value: string) => void;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onBlur={(e) => onCommit(e.target.value)}
      className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
    />
  );
}
