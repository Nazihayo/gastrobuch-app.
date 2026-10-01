"use server";

import { createClient } from "@/lib/supabase/server";
import type { CountryCode } from "@/lib/countries";
import type { OrderStatus } from "@/app/(app)/orders/actions";

export type PublicOrderStatus = {
  status: OrderStatus;
  orderType: string;
  tableNumber: string;
  createdAt: string;
  totalEstimate: number;
  restaurantName: string;
  restaurantCountry: CountryCode;
  tableSessionTotal: number | null;
  alreadyReviewed: boolean;
};

export async function getOrderStatus(orderId: string): Promise<PublicOrderStatus | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_public_order_status", { target_order_id: orderId })
    .single();

  if (error || !data) return null;

  const row = data as {
    status: OrderStatus;
    order_type: string;
    table_number: string;
    created_at: string;
    total_estimate: number;
    restaurant_name: string;
    restaurant_country: CountryCode;
    table_session_total: number | null;
    already_reviewed: boolean;
  };

  return {
    status: row.status,
    orderType: row.order_type,
    tableNumber: row.table_number,
    createdAt: row.created_at,
    totalEstimate: row.total_estimate,
    restaurantName: row.restaurant_name,
    restaurantCountry: row.restaurant_country,
    tableSessionTotal: row.table_session_total,
    alreadyReviewed: row.already_reviewed,
  };
}

export type SubmitReviewResult = { success: true } | { error: string };

export async function submitReview(
  orderId: string,
  rating: number,
  comment: string
): Promise<SubmitReviewResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    target_order_id: orderId,
    p_rating: rating,
    p_comment: comment.trim(),
  });

  if (error) return { error: error.message };
  return { success: true };
}
