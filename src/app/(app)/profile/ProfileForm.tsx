"use client";

import { useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { updateRestaurantProfile } from "./actions";

export default function ProfileForm({
  name,
  country,
  phone,
  address,
  taxId,
}: {
  name: string;
  country: CountryCode;
  phone: string;
  address: string;
  taxId: string;
}) {
  const { t } = useLanguage();
  const [, startTransition] = useTransition();
  const conf = COUNTRIES[country];

  function commit(patch: Parameters<typeof updateRestaurantProfile>[0]) {
    startTransition(() => {
      updateRestaurantProfile(patch);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("profile_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("profile_lead")}</p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-divider bg-ink-soft p-5">
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
