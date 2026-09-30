import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type CountryCode } from "@/lib/countries";
import PublicMenuView, { type PublicMenuItem } from "./PublicMenuView";

type MenuRow = {
  restaurant_name: string;
  restaurant_country: CountryCode;
  id: string;
  name: string;
  price: number;
  available: boolean;
};

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ restaurantId: string }>;
}) {
  const { restaurantId } = await params;
  const supabase = await createClient();

  const { data: rows, error } = await supabase.rpc("get_public_menu", {
    target_restaurant_id: restaurantId,
  });

  if (error || !rows || rows.length === 0) {
    notFound();
  }

  const items = rows as MenuRow[];
  const menuItems: PublicMenuItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    available: i.available,
  }));

  return (
    <PublicMenuView
      restaurantId={restaurantId}
      restaurantName={items[0].restaurant_name}
      country={items[0].restaurant_country}
      items={menuItems}
    />
  );
}
