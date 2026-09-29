import { redirect } from "next/navigation";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";
import LanguageToggle from "@/components/LanguageToggle";
import BottomNav from "@/components/BottomNav";
import RestaurantSwitcher from "@/components/RestaurantSwitcher";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [{ restaurant, role, allRestaurants }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  // Accountants get a dedicated read-only dashboard instead of the
  // operational tabs — RLS already blocks their writes, this just keeps
  // them out of a UI built for editing they can't do.
  if (role === "accountant") redirect("/accountant");
  const t = dictionaries[locale];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-divider bg-ink px-4 py-4">
        <RestaurantSwitcher
          currentId={restaurant.id}
          currentName={restaurant.name}
          restaurants={allRestaurants}
        />
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 rounded-full border border-divider px-4 py-2 text-xs font-semibold text-text-on-ink-dim"
            >
              {t.nav_sign_out}
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
