"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type SaveSalesDayState = {
  error?: string;
  savedAt?: number;
};

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const parsed = parseFloat(String(raw ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function portions(formData: FormData): Record<string, number> {
  const raw = formData.get("portions");
  if (!raw) return {};
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveSalesDay(
  _prevState: SaveSalesDayState,
  formData: FormData
): Promise<SaveSalesDayState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "invalid date" };
  }

  const payload = {
    restaurant_id: restaurant.id,
    date,
    food: num(formData, "food"),
    drink: num(formData, "drink"),
    delivery: num(formData, "delivery"),
    commission_pct: num(formData, "commissionPct"),
    purchases: num(formData, "purchases"),
    portions: portions(formData),
  };

  const { error } = await supabase
    .from("sales_days")
    .upsert(payload, { onConflict: "restaurant_id,date" });

  if (error) {
    return { error: error.message };
  }

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: (await supabase.auth.getUser()).data.user!.id,
    action: "sales_day_saved",
    detail: date,
  });

  revalidatePath("/sales");
  revalidatePath("/waste-check");
  return { savedAt: Date.now() };
}
