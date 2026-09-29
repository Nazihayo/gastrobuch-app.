"use client";

import { useActionState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { createRestaurant, type OnboardingActionState } from "./actions";

const initialState: OnboardingActionState = {};

export default function OnboardingForm() {
  const { t, locale } = useLanguage();
  const [state, formAction, pending] = useActionState(
    createRestaurant,
    initialState
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{t("onboarding_title")}</h1>
        <p className="mt-2 text-sm text-text-on-ink-dim">{t("onboarding_lead")}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="language" value={locale} />

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-text-on-ink-dim">
            {t("onboarding_name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={80}
            className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="country" className="text-sm text-text-on-ink-dim">
            {t("onboarding_country")}
          </label>
          <select
            id="country"
            name="country"
            defaultValue="de"
            className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          >
            <option value="de">{t("country_de")}</option>
            <option value="uk">{t("country_uk")}</option>
            <option value="sa">{t("country_sa")}</option>
            <option value="ae">{t("country_ae")}</option>
          </select>
        </div>

        {state.error && <p className="text-sm text-brand-red">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-11 rounded-lg bg-brand-green-bright px-4 py-2 text-sm font-semibold text-[#0A1F16] disabled:opacity-50"
        >
          {t("onboarding_submit")}
        </button>
      </form>
    </main>
  );
}
