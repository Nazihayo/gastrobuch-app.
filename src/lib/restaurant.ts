import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CountryCode } from "@/lib/countries";

export type CurrentRestaurant = {
  userId: string;
  restaurant: {
    id: string;
    name: string;
    country: CountryCode;
    language: "de" | "ar";
  };
};

// React's cache() dedupes this across the layout + page + any actions that
// call it within the same request, so redirect checks and the DB round
// trip only happen once per request despite multiple call sites.
export const getCurrentRestaurant = cache(async (): Promise<CurrentRestaurant> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("restaurant_id")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/onboarding");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, country, language")
    .eq("id", membership.restaurant_id)
    .single();

  if (!restaurant) {
    redirect("/onboarding");
  }

  return { userId: user.id, restaurant };
});
