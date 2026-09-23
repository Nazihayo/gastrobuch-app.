"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export async function saveGoals(patch: {
  salesTarget: number;
  laborPctTarget: number;
  netTarget: number;
}): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase.from("goals").upsert(
    {
      restaurant_id: restaurant.id,
      sales_target: patch.salesTarget,
      labor_pct_target: patch.laborPctTarget,
      net_target: patch.netTarget,
    },
    { onConflict: "restaurant_id" }
  );

  revalidatePath("/goals");
}
