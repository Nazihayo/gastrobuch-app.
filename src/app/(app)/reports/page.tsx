import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import { calcSale } from "@/lib/calculations";
import { monthRange } from "@/lib/monthSummary";
import ReportView from "./ReportView";

export default async function ReportsPage() {
  const [{ restaurant }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const { start, end } = monthRange();

  const [{ data: monthSales }, { data: staff }, { data: expenseRows }] = await Promise.all([
    supabase
      .from("sales_days")
      .select("date, food, drink, delivery, commission_pct, purchases")
      .eq("restaurant_id", restaurant.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true }),
    supabase.from("staff_members").select("hours, rate").eq("restaurant_id", restaurant.id),
    supabase.from("expenses").select("amount").eq("restaurant_id", restaurant.id),
  ]);

  const wages = (staff ?? []).reduce((sum, s) => sum + (s.hours || 0) * (s.rate || 0), 0);
  const expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);

  let totalSales = 0;
  let totalTax = 0;
  let totalNet = 0;
  const days: {
    date: string;
    food: number;
    drink: number;
    delivery: number;
    purchases: number;
    commissionAmount: number;
    vatDue: number;
    net: number;
  }[] = [];
  for (const day of monthSales ?? []) {
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
    totalNet += r.net;
    days.push({
      date: day.date,
      food: day.food,
      drink: day.drink,
      delivery: day.delivery,
      purchases: day.purchases,
      commissionAmount: r.commissionAmount,
      vatDue: r.vatDue,
      net: r.net,
    });
  }

  const finalNet = totalNet - wages - expenses;

  return (
    <ReportView
      locale={locale}
      country={restaurant.country}
      totalSales={totalSales}
      totalTax={totalTax}
      wages={wages}
      expenses={expenses}
      finalNet={finalNet}
      days={days}
    />
  );
}
