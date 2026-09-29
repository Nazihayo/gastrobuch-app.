import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import CustomersList from "./CustomersList";

export default async function CustomersPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, phone, address, notes")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  return <CustomersList initialCustomers={customers ?? []} />;
}
