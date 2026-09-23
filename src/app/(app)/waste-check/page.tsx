import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import WasteCheckView from "./WasteCheckView";

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = nextMonth.toISOString().slice(0, 10);
  return { start, end };
}

export default async function WasteCheckPage() {
  const [{ restaurant }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { start, end } = monthRange();

  const [{ data: monthSales }, { data: recipes }] = await Promise.all([
    supabase
      .from("sales_days")
      .select("purchases, portions")
      .eq("restaurant_id", restaurant.id)
      .gte("date", start)
      .lt("date", end),
    supabase
      .from("recipes")
      .select("id, recipe_ingredients(cost)")
      .eq("restaurant_id", restaurant.id),
  ]);

  const recipeCost = new Map<string, number>();
  for (const r of recipes ?? []) {
    const cost = r.recipe_ingredients.reduce((sum, i) => sum + (i.cost || 0), 0);
    recipeCost.set(r.id, cost);
  }

  let expected = 0;
  let actualPurch = 0;
  let anyPortions = false;
  for (const day of monthSales ?? []) {
    actualPurch += day.purchases || 0;
    const dayPortions = (day.portions as Record<string, number> | null) ?? {};
    for (const [rid, qty] of Object.entries(dayPortions)) {
      const cost = recipeCost.get(rid);
      if (cost != null) {
        expected += (qty || 0) * cost;
        if (qty > 0) anyPortions = true;
      }
    }
  }

  const hasData = (recipes ?? []).length > 0 && anyPortions;
  const warn = hasData && expected > 0 && actualPurch > expected * 1.3;

  return (
    <WasteCheckView
      locale={locale}
      country={restaurant.country}
      hasData={hasData}
      expected={expected}
      actualPurch={actualPurch}
      warn={warn}
    />
  );
}
