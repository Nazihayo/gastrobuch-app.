import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select("name, country, phone, address, tax_id")
    .eq("id", restaurant.id)
    .single();

  return (
    <ProfileForm
      name={data?.name ?? restaurant.name}
      country={restaurant.country}
      phone={data?.phone ?? ""}
      address={data?.address ?? ""}
      taxId={data?.tax_id ?? ""}
    />
  );
}
