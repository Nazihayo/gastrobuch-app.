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
  loyaltyThreshold?: number;
  loyaltyReward?: string;
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
  if (patch.loyaltyThreshold !== undefined) dbPatch.loyalty_threshold = patch.loyaltyThreshold;
  if (patch.loyaltyReward !== undefined) dbPatch.loyalty_reward = patch.loyaltyReward;
  if (patch.tableCount !== undefined) dbPatch.table_count = patch.tableCount;

  await supabase.from("restaurants").update(dbPatch).eq("id", restaurant.id);

  // The restaurant name shows in the shared (app) layout header on every
  // page, so revalidate from the root layout down, not just this route.
  revalidatePath("/", "layout");
}
