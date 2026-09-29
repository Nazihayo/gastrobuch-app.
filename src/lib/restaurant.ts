import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CountryCode } from "@/lib/countries";
import type { Locale } from "@/lib/i18n/dictionaries";

export type MemberRole = "owner" | "staff" | "accountant";
export const RESTAURANT_COOKIE = "gastrobuch_restaurant_id";

export type CurrentRestaurant = {
  userId: string;
  role: MemberRole;
  restaurant: {
    id: string;
    name: string;
    country: CountryCode;
    language: Locale;
  };
  // Every restaurant this user belongs to, for the restaurant switcher —
  // most users only ever have one, but the schema has supported many-to-many
  // memberships since day one.
  allRestaurants: { id: string; name: string }[];
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

  const { data: memberships } = await supabase
    .from("memberships")
    .select("restaurant_id, role")
    .order("created_at", { ascending: true });

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const preferredId = cookieStore.get(RESTAURANT_COOKIE)?.value;
  const selected = memberships.find((m) => m.restaurant_id === preferredId) ?? memberships[0];

  const restaurantIds = memberships.map((m) => m.restaurant_id);
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id, name, country, language")
    .in("id", restaurantIds);

  const restaurant = (restaurants ?? []).find((r) => r.id === selected.restaurant_id);
  if (!restaurant) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    role: selected.role as MemberRole,
    restaurant,
    allRestaurants: (restaurants ?? []).map((r) => ({ id: r.id, name: r.name })),
  };
});
