import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import TablesView, { type TableSession } from "./TablesView";

export default async function TablesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: sessions } = await supabase
    .from("table_sessions")
    .select("id, table_number, opened_at, orders(total_estimate, status)")
    .eq("restaurant_id", restaurant.id)
    .eq("status", "open")
    .order("opened_at", { ascending: true });

  const initialSessions: TableSession[] = (sessions ?? []).map((s) => {
    const activeOrders = s.orders.filter((o) => o.status !== "cancelled");
    return {
      id: s.id,
      tableNumber: s.table_number,
      openedAt: s.opened_at,
      orderCount: activeOrders.length,
      total: activeOrders.reduce((sum, o) => sum + o.total_estimate, 0),
    };
  });

  return <TablesView country={restaurant.country} initialSessions={initialSessions} />;
}
