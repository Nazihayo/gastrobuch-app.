"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { inviteMember, removeMember } from "./actions";

export type Member = { id: string; role: string; email: string };

export default function TeamView({ members: initialMembers }: { members: Member[] }) {
  const { t } = useLanguage();
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "accountant">("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await inviteMember(email, role);
      if (result.error) {
        setError(t(`team_error_${result.error}` as const));
      } else {
        setEmail("");
        window.location.reload();
      }
    });
  }

  function handleRemove(m: Member) {
    setMembers((prev) => prev.filter((row) => row.id !== m.id));
    startTransition(() => {
      removeMember(m.id, m.role);
    });
  }

  const roleLabel: Record<string, string> = {
    owner: t("team_role_owner"),
    staff: t("team_role_staff"),
    accountant: t("team_role_accountant"),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("team_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("team_lead")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {members.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-lg border border-divider bg-ink p-3"
          >
            <div>
              <p className="text-sm font-medium">{m.email}</p>
              <p className="text-xs text-text-on-ink-dim">{roleLabel[m.role] ?? m.role}</p>
            </div>
            {m.role !== "owner" && (
              <button
                type="button"
                onClick={() => handleRemove(m)}
                aria-label="remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={handleInvite}
        className="flex flex-col gap-3 rounded-xl border border-divider bg-ink-soft p-5"
      >
        <h2 className="text-sm font-semibold">{t("team_invite_title")}</h2>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("team_invite_email_ph")}
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "staff" | "accountant")}
          className="min-h-11 rounded-lg border border-divider bg-ink px-3 py-2 text-sm outline-none"
        >
          <option value="staff">{t("team_role_staff")}</option>
          <option value="accountant">{t("team_role_accountant")}</option>
        </select>
        {error && <p className="text-sm text-brand-red">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-lg bg-brand-green-bright px-4 py-3 text-sm font-bold text-[#0A1F16] disabled:opacity-50"
        >
          {pending ? "…" : t("team_invite_submit")}
        </button>
      </form>

      <p className="text-center text-xs text-text-on-ink-dim">{t("team_disclaimer")}</p>
    </div>
  );
}
