import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getMonthSummary } from "@/lib/monthSummary";
import BreakevenCalc from "./BreakevenCalc";

export default async function BreakevenPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { totalSales, totalPurchases, wages, expenses, dayCount } = await getMonthSummary(
    supabase,
    restaurant.id,
    restaurant.country
  );

  const fixed = wages + expenses;

  let autoRatio = 30;
  if (dayCount > 0 && totalSales > 0) {
    const computed = Math.round((totalPurchases / totalSales) * 100);
    if (computed > 0 && computed < 90) autoRatio = computed;
  }

  return (
    <BreakevenCalc
      country={restaurant.country}
      fixed={fixed}
      actualSales={totalSales}
      initialRatio={autoRatio}
    />
  );
}
