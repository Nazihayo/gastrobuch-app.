import { calcSale } from "./calculations";
import type { CountryCode } from "./countries";
import type { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = nextMonth.toISOString().slice(0, 10);
  return { start, end };
}

export type MonthSummary = {
  totalSales: number;
  totalTax: number;
  totalPurchases: number;
  monthNetFromSales: number;
  wages: number;
  expenses: number;
  finalNet: number;
  dayCount: number;
};

// Shared by the dashboard, break-even calculator, and monthly goals — all
// three need "this restaurant's current month, aggregated" and must agree
// on the same numbers.
export async function getMonthSummary(
  supabase: SupabaseServerClient,
  restaurantId: string,
  country: CountryCode
): Promise<MonthSummary> {
  const { start, end } = monthRange();

  const [{ data: monthSales }, { data: staff }, { data: expenseRows }] = await Promise.all([
    supabase
      .from("sales_days")
      .select("food, drink, delivery, commission_pct, purchases")
      .eq("restaurant_id", restaurantId)
      .gte("date", start)
      .lt("date", end),
    supabase.from("staff_members").select("hours, rate").eq("restaurant_id", restaurantId),
    supabase.from("expenses").select("amount").eq("restaurant_id", restaurantId),
  ]);

  const days = monthSales ?? [];
  let totalSales = 0;
  let totalTax = 0;
  let totalPurchases = 0;
  let monthNetFromSales = 0;
  for (const day of days) {
    const r = calcSale(
      {
        food: day.food,
        drink: day.drink,
        delivery: day.delivery,
        commissionPct: day.commission_pct,
        purchases: day.purchases,
      },
      country
    );
    totalSales += r.total;
    totalTax += r.vatDue;
    monthNetFromSales += r.net;
    totalPurchases += day.purchases || 0;
  }

  const wages = (staff ?? []).reduce((sum, s) => sum + (s.hours || 0) * (s.rate || 0), 0);
  const expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const finalNet = monthNetFromSales - wages - expenses;

  return {
    totalSales,
    totalTax,
    totalPurchases,
    monthNetFromSales,
    wages,
    expenses,
    finalNet,
    dayCount: days.length,
  };
}
