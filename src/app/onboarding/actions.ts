"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionState = {
  error?: string;
};

export async function createRestaurant(
  _prevState: OnboardingActionState,
  formData: FormData
): Promise<OnboardingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const name = String(formData.get("name") ?? "").trim();
  const country = String(formData.get("country") ?? "de");
  const language = String(formData.get("language") ?? "de");

  if (!name) {
    return { error: "onboarding_error" };
  }

  const { error } = await supabase.rpc("create_restaurant_with_owner", {
    restaurant_name: name,
    restaurant_country: country,
    restaurant_language: language,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/");
}
