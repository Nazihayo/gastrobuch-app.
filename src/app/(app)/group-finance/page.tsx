import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { calcSale } from "@/lib/calculations";
import type { CountryCode } from "@/lib/countries";
import GroupFinanceView, { type BranchFinance } from "./GroupFinanceView";

export default async function GroupFinancePage() {
  const { allRestaurants } = await getCurrentRestaurant();
  const supabase = await createClient();

  if (allRestaurants.length < 2) {
    return <GroupFinanceView branches={[]} singleBranch />;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceDate = since.toISOString().slice(0, 10);

  const { data: countryRows } = await supabase
    .from("restaurants")
    .select("id, country")
    .in(
      "id",
      allRestaurants.map((r) => r.id)
    );
  const countryById = new Map((countryRows ?? []).map((r) => [r.id, r.country as CountryCode]));

  const branches: BranchFinance[] = await Promise.all(
    allRestaurants.map(async (r) => {
      const country = countryById.get(r.id) ?? "de";
      const { data: days } = await supabase
        .from("sales_days")
        .select("food, drink, delivery, commission_pct, purchases")
        .eq("restaurant_id", r.id)
        .gte("date", sinceDate);

      let total = 0;
      let vatSalesTotal = 0;
      let vatDue = 0;
      let net = 0;

      for (const day of days ?? []) {
        const result = calcSale(
          {
            food: day.food,
            drink: day.drink,
            delivery: day.delivery,
            commissionPct: day.commission_pct,
            purchases: day.purchases,
          },
          country
        );
        total += result.total;
        vatSalesTotal += result.vatSalesTotal;
        vatDue += result.vatDue;
        net += result.net;
      }

      return { restaurantId: r.id, name: r.name, country, total, vatSalesTotal, vatDue, net };
    })
  );

  return <GroupFinanceView branches={branches} singleBranch={false} />;
}
