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
  datevKontoFood,
  datevKontoDrink,
  datevKontoWages,
  datevKontoExpenses,
  datevKontoBank,
  datevBeraterNr,
  datevMandantNr,
}: {
  name: string;
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
