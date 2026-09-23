import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ExpensesList from "./ExpensesList";

export default async function ExpensesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, name, amount")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return <ExpensesList country={restaurant.country} initialExpenses={expenses ?? []} />;
}
