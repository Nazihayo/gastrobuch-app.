"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export async function updateRestaurantProfile(patch: {
  name?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  datevKontoFood?: string;
  datevKontoDrink?: string;
  datevKontoWages?: string;
  datevKontoExpenses?: string;
  datevKontoBank?: string;
  datevBeraterNr?: string;
  datevMandantNr?: string;
  tableCount?: number;
}): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, string | number> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.phone !== undefined) dbPatch.phone = patch.phone;
  if (patch.address !== undefined) dbPatch.address = patch.address;
  if (patch.taxId !== undefined) dbPatch.tax_id = patch.taxId;
  if (patch.datevKontoFood !== undefined) dbPatch.datev_konto_food = patch.datevKontoFood;
  if (patch.datevKontoDrink !== undefined) dbPatch.datev_konto_drink = patch.datevKontoDrink;
  if (patch.datevKontoWages !== undefined) dbPatch.datev_konto_wages = patch.datevKontoWages;
  if (patch.datevKontoExpenses !== undefined)
    dbPatch.datev_konto_expenses = patch.datevKontoExpenses;
  if (patch.datevKontoBank !== undefined) dbPatch.datev_konto_bank = patch.datevKontoBank;
  if (patch.datevBeraterNr !== undefined) dbPatch.datev_berater_nr = patch.datevBeraterNr;
  if (patch.datevMandantNr !== undefined) dbPatch.datev_mandant_nr = patch.datevMandantNr;
  if (patch.tableCount !== undefined) dbPatch.table_count = patch.tableCount;

  await supabase.from("restaurants").update(dbPatch).eq("id", restaurant.id);

  // The restaurant name shows in the shared (app) layout header on every
  // page, so revalidate from the root layout down, not just this route.
  revalidatePath("/", "layout");
}

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export type UploadLogoState = { error?: string; path?: string };

export async function uploadLogo(formData: FormData): Promise<UploadLogoState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "no_file" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "not_image" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "too_large" };
  }

  const { data: existing } = await supabase
    .from("restaurants")
    .select("logo_path")
    .eq("id", restaurant.id)
    .single();
  if (existing?.logo_path) {
    await supabase.storage.from("menu-photos").remove([existing.logo_path]);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${restaurant.id}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-photos")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return { error: uploadError.message };
  }

  await supabase.from("restaurants").update({ logo_path: path }).eq("id", restaurant.id);

  revalidatePath("/", "layout");
  return { path };
}

export async function removeLogo(): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("restaurants")
    .select("logo_path")
    .eq("id", restaurant.id)
    .single();

  if (existing?.logo_path) {
    await supabase.storage.from("menu-photos").remove([existing.logo_path]);
  }

  await supabase.from("restaurants").update({ logo_path: null }).eq("id", restaurant.id);

  revalidatePath("/", "layout");
}

export type LoyaltyTier = { id: string; name: string; threshold: number; reward: string };

export async function addLoyaltyTier(): Promise<LoyaltyTier | null> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("loyalty_tiers")
    .select("threshold")
    .eq("restaurant_id", restaurant.id)
    .order("threshold", { ascending: false })
    .limit(1);

  const nextThreshold = (existing?.[0]?.threshold ?? 0) + 10;

  const { data, error } = await supabase
    .from("loyalty_tiers")
    .insert({ restaurant_id: restaurant.id, name: "", threshold: nextThreshold, reward: "" })
    .select("id, name, threshold, reward")
    .single();

  if (error || !data) return null;

  revalidatePath("/profile");
  return data;
}

export async function updateLoyaltyTier(
  id: string,
  patch: Partial<Pick<LoyaltyTier, "name" | "threshold" | "reward">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("loyalty_tiers")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/profile");
}

export async function removeLoyaltyTier(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase.from("loyalty_tiers").delete().eq("id", id).eq("restaurant_id", restaurant.id);

  revalidatePath("/profile");
}
