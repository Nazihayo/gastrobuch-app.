"use server";

import { createClient } from "@/lib/supabase/server";
import type { GroupReward, LoyaltyProgress, SubmitOrderError } from "../../actions";

export type JoinTableCartState = { sessionId?: string; error?: "generic" };

// Opens (or reuses) the table's session so every guest's device gets the
// same table_session_id to subscribe to — see open_table_cart in
// 20261010000000_shared_table_cart.sql for why this can't reuse
// create_public_order (that only opens a session at checkout time).
export async function joinTableCart(restaurantId: string, tableNumber: string): Promise<JoinTableCartState> {
  if (!tableNumber.trim()) return { error: "generic" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_table_cart", {
    target_restaurant_id: restaurantId,
    p_table_number: tableNumber.trim(),
  });

  if (error || !data) return { error: "generic" };
  return { sessionId: data as string };
}

export type SubmitTableCartState = {
  error?: SubmitOrderError;
  success?: boolean;
  orderId?: string;
  loyalty?: LoyaltyProgress;
  groupReward?: GroupReward;
  streakWeeks?: number;
};

export async function submitTableCart(
  restaurantId: string,
  sessionId: string,
  name: string,
  phone: string,
  notes: string
): Promise<SubmitTableCartState> {
  if (!name.trim() || !phone.trim()) return { error: "missing_info" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("submit_table_cart", {
      target_restaurant_id: restaurantId,
      target_session_id: sessionId,
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      notes: notes.trim(),
    })
    .single();

  if (error || !data) return { error: "generic" };

  const row = data as {
    order_id: string;
    customer_total_orders: number;
    just_reached_tier_name: string | null;
    just_reached_tier_reward: string | null;
    next_tier_name: string | null;
    next_tier_threshold: number | null;
    next_tier_reward: string | null;
    group_reward_unlocked: boolean;
    group_reward_text: string | null;
    current_streak_weeks: number;
  };

  const groupReward =
    row.group_reward_unlocked && row.group_reward_text ? { text: row.group_reward_text } : undefined;
  const streakWeeks = row.current_streak_weeks > 1 ? row.current_streak_weeks : undefined;

  if (!row.just_reached_tier_name && !row.next_tier_name) {
    return { success: true, orderId: row.order_id, groupReward, streakWeeks };
  }

  return {
    success: true,
    orderId: row.order_id,
    groupReward,
    streakWeeks,
    loyalty: {
      totalOrders: row.customer_total_orders,
      justReachedTierName: row.just_reached_tier_name,
      justReachedTierReward: row.just_reached_tier_reward,
      nextTierName: row.next_tier_name,
      nextTierThreshold: row.next_tier_threshold,
      nextTierReward: row.next_tier_reward,
    },
  };
}
