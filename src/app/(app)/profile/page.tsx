import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data }, { count: menuItemCount }] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "name, country, phone, address, tax_id, datev_konto_food, datev_konto_drink, datev_konto_wages, datev_konto_expenses, datev_konto_bank, datev_berater_nr, datev_mandant_nr"
      )
      .eq("id", restaurant.id)
      .single(),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .gt("price", 0),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const menuUrl = `${siteUrl}/menu/${restaurant.id}`;
  const hasMenuItems = (menuItemCount ?? 0) > 0;
  const menuQrDataUrl = hasMenuItems ? await QRCode.toDataURL(menuUrl, { margin: 1 }) : null;

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
      menuUrl={menuUrl}
      menuQrDataUrl={menuQrDataUrl}
    />
  );
}
