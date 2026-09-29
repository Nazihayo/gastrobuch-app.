import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import { monthRange } from "@/lib/monthSummary";
import MenuEngineeringView, { type MenuItem } from "./MenuEngineeringView";

export default async function MenuEngineeringPage() {
  const [{ restaurant }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { start, end } = monthRange();

  const [{ data: recipes }, { data: salesDays }] = await Promise.all([
    supabase
      .from("recipes")
      .select("id, name, price, recipe_ingredients(cost)")
      .eq("restaurant_id", restaurant.id),
    supabase
      .from("sales_days")
      .select("portions")
      .eq("restaurant_id", restaurant.id)
      .gte("date", start)
      .lt("date", end),
  ]);

  // Sum each recipe's portions sold across every day this month — `portions`
  // is a jsonb map of { [recipeId]: count } per day, so this is the same
  // aggregation the Sales tab writes, just rolled up over the month.
  const portionsSold = new Map<string, number>();
  for (const day of salesDays ?? []) {
    const map = (day.portions as Record<string, number> | null) ?? {};
    for (const [recipeId, count] of Object.entries(map)) {
      portionsSold.set(recipeId, (portionsSold.get(recipeId) ?? 0) + (count || 0));
    }
  }

  const items: MenuItem[] = (recipes ?? []).map((r) => {
    const cost = (r.recipe_ingredients ?? []).reduce(
      (sum: number, ing: { cost: number }) => sum + (ing.cost || 0),
      0
    );
    const price = r.price || 0;
    const marginPct = price > 0 ? ((price - cost) / price) * 100 : 0;
    return {
      id: r.id,
      name: r.name,
      marginPct,
      portionsSold: portionsSold.get(r.id) ?? 0,
    };
  });

  return <MenuEngineeringView locale={locale} items={items} />;
}
