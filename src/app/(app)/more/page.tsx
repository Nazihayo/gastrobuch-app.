import Link from "next/link";
import { getLocale } from "@/lib/i18n/server";
import { dictionaries } from "@/lib/i18n/dictionaries";

const menuItems = [
  { href: "/customers", key: "more_customers" as const },
  { href: "/expenses", key: "more_expenses" as const },
  { href: "/breakeven", key: "more_breakeven" as const },
  { href: "/recipes", key: "more_recipes" as const },
  { href: "/waste-check", key: "more_waste" as const },
  { href: "/goals", key: "more_goals" as const },
  { href: "/scenario", key: "more_scenario" as const },
  { href: "/hygiene", key: "more_hygiene" as const },
  { href: "/reports", key: "more_reports" as const },
  { href: "/profile", key: "more_profile" as const },
];

export default async function MorePage() {
  const locale = await getLocale();
  const t = dictionaries[locale];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-bold">{t.more_title}</h1>
      <div className="flex flex-col gap-2.5">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-xl border border-divider bg-ink-soft px-5 py-4 text-sm font-medium"
          >
            <span>{t[item.key]}</span>
            <span className="text-text-on-ink-dim">‹</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
