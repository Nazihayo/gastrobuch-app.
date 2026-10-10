import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import FranchiseView from "./FranchiseView";

export default async function FranchisePage() {
  const { restaurant, role } = await getCurrentRestaurant();
  if (role !== "owner") redirect("/");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("restaurants")
    .select("id, name, country")
    .eq("parent_restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  return <FranchiseView branches={branches ?? []} />;
}
