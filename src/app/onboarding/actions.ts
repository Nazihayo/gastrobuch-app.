"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_COOKIE } from "@/lib/restaurant";

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

  const { data, error } = await supabase.rpc("create_restaurant_with_owner", {
    restaurant_name: name,
    restaurant_country: country,
    restaurant_language: language,
  });

  if (error) {
    return { error: error.message };
  }

  // Make the newly created restaurant the active one — matters once a user
  // has more than one, since getCurrentRestaurant() otherwise defaults to
  // whichever restaurant they joined first.
  const cookieStore = await cookies();
  cookieStore.set(RESTAURANT_COOKIE, data.id, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });

  redirect("/");
}
