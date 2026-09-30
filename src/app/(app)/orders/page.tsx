import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import OrdersView, { type OrderWithItems } from "./OrdersView";

export default async function OrdersPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, customer_address, order_type, status, notes, total_estimate, created_at, order_items(id, recipe_name, unit_price, quantity)"
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const initialOrders: OrderWithItems[] = (orders ?? []).map((o) => ({
    id: o.id,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerAddress: o.customer_address,
    orderType: o.order_type,
    status: o.status,
    notes: o.notes,
    totalEstimate: o.total_estimate,
    createdAt: o.created_at,
    items: o.order_items.map((i) => ({
      id: i.id,
      recipeName: i.recipe_name,
      unitPrice: i.unit_price,
      quantity: i.quantity,
    })),
  }));

  return <OrdersView country={restaurant.country} initialOrders={initialOrders} />;
}
