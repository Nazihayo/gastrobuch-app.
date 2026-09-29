"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type SaveCashCountState = { error?: string; savedAt?: number };

export async function saveCashCount(
  _prev: SaveCashCountState,
  formData: FormData
): Promise<SaveCashCountState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const date = String(formData.get("date") ?? "");
  const openingBalance = parseFloat(String(formData.get("openingBalance") ?? "0")) || 0;
  const cashSales = parseFloat(String(formData.get("cashSales") ?? "0")) || 0;
  const countedClosing = parseFloat(String(formData.get("countedClosing") ?? "0")) || 0;
  const notes = String(formData.get("notes") ?? "");

  const { error } = await supabase.from("cash_counts").upsert(
    {
      restaurant_id: restaurant.id,
      date,
      opening_balance: openingBalance,
      cash_sales: cashSales,
      counted_closing: countedClosing,
      notes,
    },
    { onConflict: "restaurant_id,date" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/cashbook");
  return { savedAt: Date.now() };
}
