import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import PortfolioView, { type BrandStat } from "./PortfolioView";

export default async function PortfolioPage() {
  const { allRestaurants } = await getCurrentRestaurant();
  const supabase = await createClient();

  if (allRestaurants.length < 2) {
    return <PortfolioView stats={[]} singleBrand />;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const sinceIso = since.toISOString();

  const { data: countryRows } = await supabase
    .from("restaurants")
    .select("id, country")
    .in(
      "id",
      allRestaurants.map((r) => r.id)
    );
  const countryById = new Map((countryRows ?? []).map((r) => [r.id, r.country]));

  const stats: BrandStat[] = await Promise.all(
    allRestaurants.map(async (r) => {
      const [{ data: orders }, { count: customerCount }, { count: repeatCount }] = await Promise.all([
        supabase
          .from("orders")
          .select("total_estimate")
          .eq("restaurant_id", r.id)
          .neq("status", "cancelled")
          .gte("created_at", sinceIso),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", r.id),
        supabase
          .from("customers")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", r.id)
          .gt("total_orders", 1),
      ]);

      const orderCount = orders?.length ?? 0;
      const revenue = (orders ?? []).reduce((sum, o) => sum + o.total_estimate, 0);

      return {
        restaurantId: r.id,
        name: r.name,
        country: countryById.get(r.id) ?? "de",
        orderCount30d: orderCount,
        revenue30d: revenue,
        avgOrderValue: orderCount > 0 ? revenue / orderCount : 0,
        repeatRatePct:
          customerCount && customerCount > 0 ? Math.round(((repeatCount ?? 0) / customerCount) * 100) : 0,
      };
    })
  );

  stats.sort((a, b) => b.revenue30d - a.revenue30d);

  return <PortfolioView stats={stats} singleBrand={false} />;
}
