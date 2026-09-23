import { dictionaries, type Locale } from "./i18n/dictionaries";
import { COUNTRIES, fmtMoney, type CountryCode } from "./countries";

export type HealthAlert = { tab: "staff" | "inventory"; text: string };

export type HealthResult = {
  score: number;
  emoji: "🟢" | "🟡" | "🔴";
  reasons: string[];
  alerts: HealthAlert[];
};

type StaffRow = { name: string; hours: number; rate: number };
type InventoryRow = { name: string; unit: string; needed: number; remaining: number };

function fill(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replace(`{${key}}`, String(value)),
    template
  );
}

// Ported 1:1 from the original prototype's renderAlerts(). Same thresholds,
// same score deductions — check reference/daftar-app.html before changing
// any number here.
export function computeHealth({
  totalSales,
  wages,
  staff,
  inventory,
  country,
  locale,
}: {
  totalSales: number;
  wages: number;
  staff: StaffRow[];
  inventory: InventoryRow[];
  country: CountryCode;
  locale: Locale;
}): HealthResult {
  const t = dictionaries[locale];
  const reasons: string[] = [];
  const alerts: HealthAlert[] = [];
  let score = 100;

  if (totalSales > 0) {
    const laborPct = (wages / totalSales) * 100;
    if (laborPct > 35) {
      alerts.push({
        tab: "staff",
        text: fill(t.health_alert_labor, { pct: laborPct.toFixed(0) }),
      });
      score -= 20;
      reasons.push(t.health_reason_labor_bad);
    } else if (laborPct > 30) {
      score -= 8;
      reasons.push(t.health_reason_labor_warn);
    } else {
      reasons.push(t.health_reason_labor_good);
    }
  }

  const minijobLimit = COUNTRIES[country].minijob;
  if (minijobLimit) {
    for (const s of staff) {
      const wage = (s.hours || 0) * (s.rate || 0);
      if (wage > minijobLimit) {
        alerts.push({
          tab: "staff",
          text: fill(t.health_alert_minijob, {
            name: s.name || "—",
            limit: fmtMoney(minijobLimit, country),
          }),
        });
        score -= 10;
      }
    }
  }

  let needOrderCount = 0;
  for (const it of inventory) {
    const needed = it.needed || 0;
    const remaining = it.remaining || 0;
    if (needed > 0 && remaining <= needed * 0.15) {
      needOrderCount++;
      alerts.push({
        tab: "inventory",
        text: fill(t.health_alert_inventory, {
          name: it.name || "—",
          remaining,
          unit: it.unit || "",
        }),
      });
    }
  }
  if (needOrderCount > 0) {
    score -= Math.min(needOrderCount * 5, 20);
    reasons.push(fill(t.health_reason_inventory_warn, { count: needOrderCount }));
  } else if (inventory.length > 0) {
    reasons.push(t.health_reason_inventory_good);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const emoji = score >= 75 ? "🟢" : score >= 50 ? "🟡" : "🔴";

  return { score, emoji, reasons, alerts };
}
