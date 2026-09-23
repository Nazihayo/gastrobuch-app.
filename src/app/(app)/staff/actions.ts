"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type StaffMember = {
  id: string;
  name: string;
  hours: number;
  rate: number;
};

export async function addStaffMember(): Promise<StaffMember | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("staff_members")
    .insert({ restaurant_id: restaurant.id, name: "", hours: 0, rate: 0 })
    .select("id, name, hours, rate")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "staff_member_added",
    detail: "",
  });

  revalidatePath("/staff");
  return data;
}

export async function updateStaffMember(
  id: string,
  patch: Partial<Pick<StaffMember, "name" | "hours" | "rate">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("staff_members")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/staff");
}

export async function removeStaffMember(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("staff_members")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "staff_member_removed",
    detail: name,
  });

  revalidatePath("/staff");
}
