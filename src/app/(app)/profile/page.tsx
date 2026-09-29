import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select(
      "name, country, phone, address, tax_id, datev_konto_food, datev_konto_drink, datev_konto_wages, datev_konto_expenses, datev_konto_bank, datev_berater_nr, datev_mandant_nr"
    )
    .eq("id", restaurant.id)
    .single();

  return (
    <ProfileForm
      name={data?.name ?? restaurant.name}
      country={restaurant.country}
      phone={data?.phone ?? ""}
      address={data?.address ?? ""}
      taxId={data?.tax_id ?? ""}
      datevKontoFood={data?.datev_konto_food ?? ""}
      datevKontoDrink={data?.datev_konto_drink ?? ""}
      datevKontoWages={data?.datev_konto_wages ?? ""}
      datevKontoExpenses={data?.datev_konto_expenses ?? ""}
      datevKontoBank={data?.datev_konto_bank ?? ""}
      datevBeraterNr={data?.datev_berater_nr ?? ""}
      datevMandantNr={data?.datev_mandant_nr ?? ""}
    />
  );
}
