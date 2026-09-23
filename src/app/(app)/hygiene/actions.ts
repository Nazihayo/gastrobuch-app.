"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type TempReading = {
  id: string;
  name: string;
  type: "cooling" | "freezing";
  value: number;
};

export async function saveChecklist(date: string, checklist: boolean[]): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("hygiene_logs")
    .upsert(
      { restaurant_id: restaurant.id, date, checklist },
      { onConflict: "restaurant_id,date" }
    );

  revalidatePath("/hygiene");
}

export async function addTempReading(date: string): Promise<TempReading | null> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hygiene_temp_readings")
    .insert({ restaurant_id: restaurant.id, date, name: "", type: "cooling", value: 4 })
    .select("id, name, type, value")
    .single();

  if (error || !data) return null;

  revalidatePath("/hygiene");
  return data;
}

export async function updateTempReading(
  id: string,
  patch: Partial<Pick<TempReading, "name" | "type" | "value">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("hygiene_temp_readings")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/hygiene");
}

export async function removeTempReading(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("hygiene_temp_readings")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/hygiene");
}
