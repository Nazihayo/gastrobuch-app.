import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import { getRamadanStatus } from "@/lib/prayerTimes";
import PublicMenuView, { type PublicMenuItem } from "./PublicMenuView";

type MenuRow = {
  restaurant_name: string;
  restaurant_country: CountryCode;
  restaurant_logo_path: string | null;
  restaurant_whatsapp_number: string | null;
  restaurant_stripe_onboarded: boolean;
  restaurant_ramadan_mode_enabled: boolean;
  restaurant_ramadan_city: string;
  id: string;
  name: string;
  price: number;
  available: boolean;
  photo_path: string | null;
  category: "food" | "drink";
  diet_tag: "vegan" | "vegetarian" | null;
  ramadan_tag: "iftar" | "suhoor" | null;
};

export default async function PublicMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ table?: string }>;
}) {
  const { restaurantId } = await params;
  const { table } = await searchParams;
  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("get_public_menu", {
    target_restaurant_id: restaurantId,
  });

  if (error || !rows || rows.length === 0) {
    notFound();
  }

  const items = rows as MenuRow[];
  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from("menu-photos").getPublicUrl(path).data.publicUrl : null;

  const menuItems: PublicMenuItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    available: i.available,
    photoUrl: publicUrl(i.photo_path),
    category: i.category,
    dietTag: i.diet_tag,
    ramadanTag: i.ramadan_tag,
  }));

  const ramadanModeEnabled = items[0].restaurant_ramadan_mode_enabled;
  const ramadanStatus = ramadanModeEnabled
    ? await getRamadanStatus(items[0].restaurant_ramadan_city, COUNTRIES[items[0].restaurant_country].code)
    : null;

  return (
    <PublicMenuView
      restaurantId={restaurantId}
      restaurantName={items[0].restaurant_name}
      restaurantLogoUrl={publicUrl(items[0].restaurant_logo_path)}
      restaurantWhatsapp={items[0].restaurant_whatsapp_number}
      restaurantStripeOnboarded={items[0].restaurant_stripe_onboarded}
      country={items[0].restaurant_country}
      items={menuItems}
      lockedTableNumber={table?.trim() || undefined}
      ramadanStatus={ramadanModeEnabled ? ramadanStatus : null}
    />
  );
}
