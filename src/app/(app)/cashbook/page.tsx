import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import CashBookView from "./CashBookView";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function CashBookPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const today = todayKey();

  const [{ data: todayRow }, { data: history }] = await Promise.all([
    supabase
      .from("cash_counts")
      .select("date, opening_balance, cash_sales, counted_closing, notes")
      .eq("restaurant_id", restaurant.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("cash_counts")
      .select("date, opening_balance, cash_sales, counted_closing")
      .eq("restaurant_id", restaurant.id)
      .order("date", { ascending: false })
      .limit(7),
  ]);

  return (
    <CashBookView
      country={restaurant.country}
      today={today}
      todayRow={todayRow ?? null}
      history={history ?? []}
    />
  );
}
