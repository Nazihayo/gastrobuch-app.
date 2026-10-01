import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import CustomersList from "./CustomersList";

export default async function CustomersPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, address, notes, total_orders")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("customer_phone, created_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  // orders are sorted newest-first, so the first row seen per phone is that
  // customer's most recent order.
  const lastOrderByPhone = new Map<string, string>();
  for (const o of orders ?? []) {
    if (o.customer_phone && !lastOrderByPhone.has(o.customer_phone)) {
      lastOrderByPhone.set(o.customer_phone, o.created_at);
    }
  }

  const initialCustomers = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    totalOrders: c.total_orders,
    lastOrderAt: lastOrderByPhone.get(c.phone) ?? null,
  }));

  return (
    <CustomersList
      initialCustomers={initialCustomers}
      restaurantName={restaurant.name}
      country={restaurant.country}
    />
  );
}
