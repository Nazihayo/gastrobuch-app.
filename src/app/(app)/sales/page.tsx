import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import SalesForm from "./SalesForm";

export type SalesDayRow = {
  date: string;
  food: number;
  drink: number;
  delivery: number;
  commission_pct: number;
  purchases: number;
};

export type RecipeOption = { id: string; name: string };

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function SalesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const today = todayKey();

  const [{ data: history }, { data: todayRow }, { data: recipes }] = await Promise.all([
    supabase
      .from("sales_days")
      .select("date, food, drink, delivery, commission_pct, purchases")
      .eq("restaurant_id", restaurant.id)
      .order("date", { ascending: false })
      .limit(7),
    supabase
      .from("sales_days")
      .select("portions")
      .eq("restaurant_id", restaurant.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("recipes")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
  ]);

  const todayEntry = (history ?? []).find((row) => row.date === today) ?? null;
  const todayPortions = (todayRow?.portions as Record<string, number> | null) ?? {};

  return (
    <SalesForm
      country={restaurant.country}
      today={today}
      todayEntry={todayEntry}
      history={history ?? []}
      recipes={recipes ?? []}
      todayPortions={todayPortions}
    />
  );
}
