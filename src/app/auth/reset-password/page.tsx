"use client";

import { useActionState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { updatePassword, type ResetPasswordState } from "./actions";

const initialState: ResetPasswordState = {};

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{t("reset_title")}</h1>
        <p className="mt-2 text-sm text-text-on-ink-dim">{t("reset_lead")}</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-text-on-ink-dim">
            {t("reset_new_password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="min-h-11 rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
          />
        </div>

        {state.error && <p className="text-sm text-brand-red">{t("reset_error")}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 min-h-11 rounded-lg bg-brand-green-bright px-4 py-2 text-sm font-semibold text-[#0A1F16] disabled:opacity-50"
        >
          {t("reset_submit")}
        </button>
      </form>
    </main>
  );
}
