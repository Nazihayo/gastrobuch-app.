"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import type { TipPayout, TipSplitMethod } from "@/lib/tips";

export type TipPoolHistoryEntry = {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmount: number;
  splitMethod: TipSplitMethod;
  createdAt: string;
  payouts: TipPayout[];
};

export async function saveTipPool(
  periodStart: string,
  periodEnd: string,
  totalAmount: number,
  method: TipSplitMethod,
  payouts: TipPayout[]
): Promise<{ id: string } | { error: string }> {
  if (payouts.length === 0) return { error: "no_payouts" };

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: pool, error: poolError } = await supabase
    .from("tip_pools")
    .insert({
      restaurant_id: restaurant.id,
      period_start: periodStart,
      period_end: periodEnd,
      total_amount: totalAmount,
      split_method: method,
    })
    .select("id")
    .single();

  if (poolError || !pool) return { error: poolError?.message ?? "generic" };

  const { error: payoutError } = await supabase.from("tip_pool_payouts").insert(
    payouts.map((p) => ({
      tip_pool_id: pool.id,
      staff_member_id: p.staffMemberId,
      staff_name: p.staffName,
      hours: p.hours,
      amount: p.amount,
    }))
  );

  if (payoutError) return { error: payoutError.message };

  revalidatePath("/tips");
  return { id: pool.id };
}

export async function removeTipPool(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase.from("tip_pools").delete().eq("id", id).eq("restaurant_id", restaurant.id);

  revalidatePath("/tips");
}
