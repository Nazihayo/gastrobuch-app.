"use server";

import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error?: string; success?: boolean };

export async function changePassword(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 6) {
    return { error: "too_short" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }
  return { success: true };
}

export async function changeEmail(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const email = String(formData.get("email") ?? "").trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${siteUrl}/auth/confirm` }
  );
  if (error) {
    return { error: error.message };
  }
  return { success: true };
}
