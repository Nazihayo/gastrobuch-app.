"use client";

import { useActionState, useState } from "react";
import { useLanguage } from "@/lib/i18n/context";
import LanguageToggle from "@/components/LanguageToggle";
import { signIn, signUp, type AuthActionState } from "./actions";

const initialState: AuthActionState = {};

export default function LoginPage() {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex justify-center">
        <LanguageToggle />
      </div>
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">
          {mode === "signin" ? t("login_title") : t("signup_title")}
        </h1>
        <p className="mt-2 text-sm text-text-on-ink-dim">
          {mode === "signin" ? t("login_lead") : t("signup_lead")}
        </p>
      </div>

      {state.checkEmail ? (
        <p className="rounded-lg border border-divider bg-ink-soft p-4 text-sm text-text-on-ink">
          {t("signup_check_email")}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-sm text-text-on-ink-dim">
              {t("login_email")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-sm text-text-on-ink-dim">
              {t("login_password")}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="rounded-lg border border-divider bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
            />
          </div>

          {state.error && (
            <p className="text-sm text-brand-red">
              {state.error} —{" "}
              {mode === "signin" ? t("login_error") : t("signup_error")}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-brand-green-bright px-4 py-2 text-sm font-semibold text-[#0A1F16] disabled:opacity-50"
          >
            {mode === "signin" ? t("login_submit") : t("signup_submit")}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="text-center text-sm text-brand-green-bright underline"
      >
        {mode === "signin" ? t("login_switch_to_signup") : t("signup_switch_to_login")}
      </button>
    </main>
  );
}
