import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import { calcSale } from "@/lib/calculations";
import { computeHealth } from "@/lib/health";
import DashboardView from "./DashboardView";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const end = nextMonth.toISOString().slice(0, 10);
  return { start, end };
}

export default async function DashboardPage() {
  const [{ restaurant }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { start, end } = monthRange();

  const [{ data: monthSales }, { data: staff }, { data: inventory }, { data: expenseRows }] =
    await Promise.all([
      supabase
        .from("sales_days")
        .select("date, food, drink, delivery, commission_pct, purchases")
        .eq("restaurant_id", restaurant.id)
        .gte("date", start)
        .lt("date", end),
      supabase
        .from("staff_members")
        .select("name, hours, rate")
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("inventory_items")
        .select("name, unit, needed, remaining")
        .eq("restaurant_id", restaurant.id),
      supabase.from("expenses").select("amount").eq("restaurant_id", restaurant.id),
    ]);

  const days = monthSales ?? [];
  const todayEntry = days.find((d) => d.date === todayKey()) ?? null;

  let totalSales = 0;
  let totalTax = 0;
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
      restaurant.country
    );
    totalSales += r.total;
    totalTax += r.vatDue;
    monthNetFromSales += r.net;
  }

  const wages = (staff ?? []).reduce((sum, s) => sum + (s.hours || 0) * (s.rate || 0), 0);
  const expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const finalNet = monthNetFromSales - wages - expenses;

  const showCashForecast = days.length >= 2;
  const avgDailyNet = showCashForecast ? monthNetFromSales / days.length : 0;
  const projectedFinal = avgDailyNet * 30 - wages - expenses;

  const health = computeHealth({
    totalSales,
    wages,
    staff: staff ?? [],
    inventory: inventory ?? [],
    country: restaurant.country,
    locale,
  });

  const todayResult = todayEntry
    ? calcSale(
        {
          food: todayEntry.food,
          drink: todayEntry.drink,
          delivery: todayEntry.delivery,
          commissionPct: todayEntry.commission_pct,
          purchases: todayEntry.purchases,
        },
        restaurant.country
      )
    : null;

  return (
    <DashboardView
      locale={locale}
      country={restaurant.country}
      todayResult={todayResult}
      totalSales={totalSales}
      totalTax={totalTax}
      wages={wages}
      expenses={expenses}
      finalNet={finalNet}
      showCashForecast={showCashForecast}
      projectedFinal={projectedFinal}
      health={health}
    />
  );
}
