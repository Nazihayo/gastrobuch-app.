import Link from "next/link";
import { dictionaries, type Locale } from "@/lib/i18n/dictionaries";

export type MenuItem = {
  id: string;
  name: string;
  marginPct: number;
  portionsSold: number;
};

export type Quadrant = "star" | "puzzle" | "plowhorse" | "dog";

export function classify(items: MenuItem[]): Map<string, Quadrant> {
  const totalPortions = items.reduce((sum, i) => sum + i.portionsSold, 0);
  const avgMargin =
    items.length > 0 ? items.reduce((sum, i) => sum + i.marginPct, 0) / items.length : 0;
  const averageShare = items.length > 0 ? 1 / items.length : 0;
  // The standard menu-engineering "70% rule": an item counts as popular once
  // its share of total sales reaches 70% of what an even split would give it.
  const popularityThreshold = averageShare * 0.7;

  const result = new Map<string, Quadrant>();
  for (const item of items) {
    const share = totalPortions > 0 ? item.portionsSold / totalPortions : 0;
    const popular = share >= popularityThreshold;
    const profitable = item.marginPct >= avgMargin;
    result.set(item.id, popular && profitable ? "star" : profitable ? "puzzle" : popular ? "plowhorse" : "dog");
  }
  return result;
}

export default function MenuEngineeringView({
  locale,
  items,
}: {
  locale: Locale;
  items: MenuItem[];
}) {
  const t = dictionaries[locale];
  const numFmt = locale === "ar" ? "ar" : "de-DE";

  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/more" className="text-sm text-text-on-ink-dim">
            {t.back}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold">{t.me_title}</h1>
        </div>
        <p className="text-sm text-text-on-ink-dim">{t.me_empty}</p>
      </div>
    );
  }

  const totalPortions = items.reduce((sum, i) => sum + i.portionsSold, 0);
  if (totalPortions === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Link href="/more" className="text-sm text-text-on-ink-dim">
            {t.back}
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold">{t.me_title}</h1>
        </div>
        <p className="text-sm text-text-on-ink-dim">{t.me_no_data}</p>
      </div>
    );
  }

  const quadrants = classify(items);
  const groups: { key: Quadrant; label: string; tip: string; tone: "green" | "red" | "neutral" }[] = [
    { key: "star", label: t.me_star, tip: t.me_star_tip, tone: "green" },
    { key: "puzzle", label: t.me_puzzle, tip: t.me_puzzle_tip, tone: "neutral" },
    { key: "plowhorse", label: t.me_plowhorse, tip: t.me_plowhorse_tip, tone: "neutral" },
    { key: "dog", label: t.me_dog, tip: t.me_dog_tip, tone: "red" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/more" className="text-sm text-text-on-ink-dim">
          {t.back}
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold">{t.me_title}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t.me_lead}</p>
      </div>

      {groups.map((group) => {
        const groupItems = items.filter((i) => quadrants.get(i.id) === group.key);
        if (groupItems.length === 0) return null;
        return (
          <div
            key={group.key}
            className={`rounded-xl border p-4 ${
              group.tone === "green"
                ? "border-brand-green-bright bg-[rgba(31,107,77,0.12)]"
                : group.tone === "red"
                ? "border-brand-red bg-[rgba(192,85,74,0.1)]"
                : "border-divider bg-ink-soft"
            }`}
          >
            <h2 className="text-sm font-bold">{group.label}</h2>
            <p className="mt-1 text-xs text-text-on-ink-dim">{group.tip}</p>
            <div className="mt-3 flex flex-col gap-2">
              {groupItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-ink px-3 py-2.5 text-sm"
                >
                  <span>{item.name || "—"}</span>
                  <span className="font-num text-xs text-text-on-ink-dim">
                    {item.marginPct.toFixed(0)}% · {item.portionsSold.toLocaleString(numFmt)}×
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <p className="text-center text-xs text-text-on-ink-dim">{t.me_disclaimer}</p>
    </div>
  );
}
