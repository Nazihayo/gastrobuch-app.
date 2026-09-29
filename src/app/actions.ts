"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_COOKIE } from "@/lib/restaurant";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchRestaurant(restaurantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(RESTAURANT_COOKIE, restaurantId, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  redirect("/");
}
