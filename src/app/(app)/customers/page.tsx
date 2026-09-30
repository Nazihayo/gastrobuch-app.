import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import CustomersList from "./CustomersList";

export default async function CustomersPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, address, notes, total_orders")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  const initialCustomers = (customers ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    notes: c.notes,
    totalOrders: c.total_orders,
  }));

  return <CustomersList initialCustomers={initialCustomers} />;
}
