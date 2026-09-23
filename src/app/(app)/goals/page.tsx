import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getMonthSummary } from "@/lib/monthSummary";
import GoalsForm from "./GoalsForm";

export default async function GoalsPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: goalsRow }, summary] = await Promise.all([
    supabase
      .from("goals")
      .select("sales_target, labor_pct_target, net_target")
      .eq("restaurant_id", restaurant.id)
      .maybeSingle(),
    getMonthSummary(supabase, restaurant.id, restaurant.country),
  ]);

  const laborPct = summary.totalSales > 0 ? (summary.wages / summary.totalSales) * 100 : 0;

  return (
    <GoalsForm
      country={restaurant.country}
      initialSalesTarget={goalsRow?.sales_target ?? 0}
      initialLaborPctTarget={goalsRow?.labor_pct_target ?? 0}
      initialNetTarget={goalsRow?.net_target ?? 0}
      actualSales={summary.totalSales}
      actualLaborPct={laborPct}
      actualNet={summary.finalNet}
    />
  );
}
