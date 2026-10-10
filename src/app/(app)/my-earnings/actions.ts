"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export async function claimStaffMember(staffMemberId: string): Promise<{ error?: string }> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("staff_members")
    .update({ user_id: userId })
    .eq("id", staffMemberId)
    .eq("restaurant_id", restaurant.id)
    .is("user_id", null);

  if (error) return { error: error.code === "23505" ? "already_claimed" : "generic" };

  revalidatePath("/my-earnings");
  return {};
}
