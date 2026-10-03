import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data }, { count: menuItemCount }, { data: loyaltyTiers }] = await Promise.all([
    supabase
      .from("restaurants")
      .select(
        "name, country, phone, address, tax_id, datev_konto_food, datev_konto_drink, datev_konto_wages, datev_konto_expenses, datev_konto_bank, datev_berater_nr, datev_mandant_nr, table_count, logo_path, whatsapp_number, stripe_account_id, stripe_onboarded"
      )
      .eq("id", restaurant.id)
      .single(),
    supabase
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", restaurant.id)
      .gt("price", 0),
    supabase
      .from("loyalty_tiers")
      .select("id, name, threshold, reward")
      .eq("restaurant_id", restaurant.id)
      .order("threshold", { ascending: true }),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const menuUrl = `${siteUrl}/menu/${restaurant.id}`;
  const hasMenuItems = (menuItemCount ?? 0) > 0;
  const menuQrDataUrl = hasMenuItems ? await QRCode.toDataURL(menuUrl, { margin: 1 }) : null;

  const logoUrl = data?.logo_path
    ? supabase.storage.from("menu-photos").getPublicUrl(data.logo_path).data.publicUrl
    : null;

  const tableCount = data?.table_count ?? 0;
  const tableQrCodes =
    hasMenuItems && tableCount > 0
      ? await Promise.all(
          Array.from({ length: tableCount }, (_, i) => i + 1).map(async (n) => ({
            number: n,
            qrDataUrl: await QRCode.toDataURL(`${menuUrl}?table=${n}`, { margin: 1 }),
          }))
        )
      : [];

  return (
    <ProfileForm
      name={data?.name ?? restaurant.name}
      logoUrl={logoUrl}
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
      whatsappNumber={data?.whatsapp_number ?? ""}
      stripeConnected={Boolean(data?.stripe_account_id)}
      stripeOnboarded={data?.stripe_onboarded ?? false}
      loyaltyTiers={loyaltyTiers ?? []}
      tableCount={tableCount}
      tableQrCodes={tableQrCodes}
      hasMenuItems={hasMenuItems}
      menuUrl={menuUrl}
      menuQrDataUrl={menuQrDataUrl}
    />
  );
}
