"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Shift = {
  id: string;
  staffMemberId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
};

export type AddShiftState = { error?: string };

export async function addShift(
  _prev: AddShiftState,
  formData: FormData
): Promise<AddShiftState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const staffMemberId = String(formData.get("staffMemberId") ?? "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "");
  const endTime = String(formData.get("endTime") ?? "");

  if (!staffMemberId || !date || !startTime || !endTime) {
    return { error: "invalid" };
  }

  const { error } = await supabase.from("staff_shifts").insert({
    restaurant_id: restaurant.id,
    staff_member_id: staffMemberId,
    date,
    start_time: startTime,
    end_time: endTime,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/schedule");
  return {};
}

export async function removeShift(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("staff_shifts")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/schedule");
}
