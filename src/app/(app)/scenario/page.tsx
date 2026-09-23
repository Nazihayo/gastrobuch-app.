import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getMonthSummary } from "@/lib/monthSummary";
import ScenarioLab from "./ScenarioLab";

export default async function ScenarioPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { totalSales, monthNetFromSales, wages, expenses, finalNet } = await getMonthSummary(
    supabase,
    restaurant.id,
    restaurant.country
  );

  return (
    <ScenarioLab
      country={restaurant.country}
      baseSales={totalSales}
      baseNetFromSales={monthNetFromSales}
      baseNet={finalNet}
      wages={wages}
      expenses={expenses}
    />
  );
}
