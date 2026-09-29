"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
};

export async function addCustomer(): Promise<Customer | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("customers")
    .insert({ restaurant_id: restaurant.id, name: "", phone: "", address: "", notes: "" })
    .select("id, name, phone, address, notes")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "customer_added",
    detail: "",
  });

  revalidatePath("/customers");
  return data;
}

export async function updateCustomer(
  id: string,
  patch: Partial<Pick<Customer, "name" | "phone" | "address" | "notes">>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("customers")
    .update(patch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/customers");
}

export async function removeCustomer(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "customer_removed",
    detail: name,
  });

  revalidatePath("/customers");
}
