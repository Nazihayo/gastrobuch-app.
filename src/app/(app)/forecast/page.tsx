import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeForecast } from "@/lib/forecast";
import ForecastView from "./ForecastView";

export default async function ForecastPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: salesDays }, { data: recipes }] = await Promise.all([
    supabase
      .from("sales_days")
      .select("date, food, drink, delivery, portions")
      .eq("restaurant_id", restaurant.id)
      .order("date", { ascending: false })
      .limit(180),
    supabase.from("recipes").select("id, name").eq("restaurant_id", restaurant.id),
  ]);

  const forecast = computeForecast(
    (salesDays ?? []).map((d) => ({
      date: d.date,
      food: d.food,
      drink: d.drink,
      delivery: d.delivery,
      portions: (d.portions as Record<string, number>) ?? {},
    })),
    recipes ?? [],
    new Date()
  );

  return <ForecastView country={restaurant.country} forecast={forecast} />;
}
