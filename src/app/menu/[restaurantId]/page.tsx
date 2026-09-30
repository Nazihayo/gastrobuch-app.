import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import { fmtMoney, type CountryCode } from "@/lib/countries";

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
  const [supabase, locale] = await Promise.all([createClient(), getLocale()]);
  const t = dictionaries[locale];

  const { data: rows, error } = await supabase.rpc("get_public_menu", {
    target_restaurant_id: restaurantId,
  });

  if (error || !rows || rows.length === 0) {
    notFound();
  }

  const items = rows as MenuRow[];
  const restaurantName = items[0].restaurant_name;
  const country = items[0].restaurant_country;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{restaurantName}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t.public_menu_lead}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-xl border p-4 ${
              item.available ? "border-divider bg-ink-soft" : "border-divider bg-ink-soft opacity-50"
            }`}
          >
            <span className="text-sm font-medium">{item.name || "—"}</span>
            <div className="flex items-center gap-2">
              {!item.available && (
                <span className="text-xs font-semibold text-brand-red">
                  {t.public_menu_sold_out}
                </span>
              )}
              <span className="font-num text-sm font-bold">{fmtMoney(item.price, country)}</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t.public_menu_disclaimer}</p>
    </main>
  );
}
