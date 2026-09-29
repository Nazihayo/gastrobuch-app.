"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export async function updateRestaurantProfile(patch: {
  name?: string;
  phone?: string;
  address?: string;
  taxId?: string;
}): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, string> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.taxId !== undefined) dbPatch.tax_id = patch.taxId;

  await supabase.from("restaurants").update(dbPatch).eq("id", restaurant.id);

  // The restaurant name shows in the shared (app) layout header on every
  // page, so revalidate from the root layout down, not just this route.
  revalidatePath("/", "layout");
}
