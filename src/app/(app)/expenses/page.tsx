import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ExpensesList from "./ExpensesList";

export default async function ExpensesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, name, amount, receipt_path")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  const initialExpenses = (expenses ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    receiptPath: e.receipt_path,
  }));

  return <ExpensesList country={restaurant.country} initialExpenses={initialExpenses} />;
}
