import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type CountryCode } from "@/lib/countries";
import SharedTableCartView, { type SharedCartMenuItem } from "./SharedTableCartView";

type MenuRow = {
  restaurant_name: string;
  restaurant_country: CountryCode;
  restaurant_logo_path: string | null;
  id: string;
  name: string;
  price: number;
  available: boolean;
  photo_path: string | null;
  category: "food" | "drink";
  diet_tag: "vegan" | "vegetarian" | null;
};

export default async function SharedTableCartPage({
  params,
}: {
  params: Promise<{ restaurantId: string; tableNumber: string }>;
}) {
  const { restaurantId, tableNumber } = await params;
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

  const menuItems: SharedCartMenuItem[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    price: i.price,
    available: i.available,
    photoUrl: publicUrl(i.photo_path),
    category: i.category,
    dietTag: i.diet_tag,
  }));

  return (
    <SharedTableCartView
      restaurantId={restaurantId}
      restaurantName={items[0].restaurant_name}
      restaurantLogoUrl={publicUrl(items[0].restaurant_logo_path)}
      country={items[0].restaurant_country}
      items={menuItems}
      tableNumber={decodeURIComponent(tableNumber)}
    />
  );
}
