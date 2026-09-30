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
  };

  return {
    status: row.status,
    orderType: row.order_type,
    tableNumber: row.table_number,
    createdAt: row.created_at,
    totalEstimate: row.total_estimate,
    restaurantName: row.restaurant_name,
    restaurantCountry: row.restaurant_country,
  };
}
