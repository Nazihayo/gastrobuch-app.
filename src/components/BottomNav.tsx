"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/lib/i18n/context";

const items = [
  { href: "/", icon: "🏠", key: "nav_dashboard" as const },
  { href: "/sales", icon: "💶", key: "nav_sales" as const },
  { href: "/staff", icon: "👥", key: "nav_staff" as const },
  { href: "/inventory", icon: "📦", key: "nav_inventory" as const },
  { href: "/more", icon: "⋯", key: "nav_more" as const },
];

const mainPaths = items.map((i) => i.href);

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  // Any route outside the primary tabs (e.g. /breakeven) highlights "More",
  // same as the original app's tab-highlight fallback.
  const highlightHref = mainPaths.includes(pathname) ? pathname : "/more";

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-divider bg-ink-soft px-1 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2">
      {items.map((item) => {
        const active = highlightHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 px-1 py-1.5 text-[10px] ${
              active ? "text-brand-green-bright" : "text-text-on-ink-dim"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
