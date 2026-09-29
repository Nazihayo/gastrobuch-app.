"use client";

import { useActionState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { changeEmail, changePassword, type SettingsState } from "./actions";

const initialState: SettingsState = {};

export default function SettingsView({ currentEmail }: { currentEmail: string }) {
  const { t } = useLanguage();
  const [emailState, emailAction, emailPending] = useActionState(changeEmail, initialState);
  const [pwState, pwAction, pwPending] = useActionState(changePassword, initialState);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("settings_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("settings_lead")}</p>
      </div>

      <form
        action={emailAction}
        className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5"
      >
        <h2 className="text-sm font-semibold">{t("settings_email_title")}</h2>
        <input
          type="email"
          name="email"
          required
          defaultValue={currentEmail}
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        {emailState.success && (
          <p className="text-sm text-brand-green-bright">{t("settings_email_success")}</p>
        )}
        {emailState.error && <p className="text-sm text-brand-red">{t("settings_error")}</p>}
        <button
          type="submit"
          disabled={emailPending}
          className="min-h-11 rounded-lg border border-divider px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {t("settings_email_submit")}
        </button>
      </form>

      <form
        action={pwAction}
        className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5"
      >
        <h2 className="text-sm font-semibold">{t("settings_password_title")}</h2>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          placeholder={t("reset_new_password")}
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        {pwState.success && (
          <p className="text-sm text-brand-green-bright">{t("settings_password_success")}</p>
        )}
        {pwState.error && <p className="text-sm text-brand-red">{t("settings_error")}</p>}
        <button
          type="submit"
          disabled={pwPending}
          className="min-h-11 rounded-lg border border-divider px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {t("settings_password_submit")}
        </button>
      </form>
    </div>
  );
}
