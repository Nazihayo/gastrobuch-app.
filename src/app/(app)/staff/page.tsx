import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import StaffList from "./StaffList";

export default async function StaffPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: staff } = await supabase
    .from("staff_members")
    .select("id, name, hours, rate")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return <StaffList country={restaurant.country} initialStaff={staff ?? []} />;
}
