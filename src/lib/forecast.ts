export type SalesDayInput = {
  date: string;
  food: number;
  drink: number;
  delivery: number;
  portions: Record<string, number>;
};

export type ForecastRecipe = { id: string; name: string };

export type ForecastItem = { name: string; avgPortions: number };

export type ForecastDayResult = {
  date: string;
  weekday: number;
  sampleSize: number;
  avgRevenue: number | null;
  topItems: ForecastItem[];
};

// A plain historical average per weekday — not a machine-learning model.
// Deliberately simple and explainable: "your last N Mondays averaged X" is
// something an owner can sanity-check at a glance, unlike a black-box
// prediction. Needs no external AI call, so it's free and always available.
export function computeForecast(
  salesDays: SalesDayInput[],
  recipes: ForecastRecipe[],
  today: Date,
  daysAhead = 7
): ForecastDayResult[] {
  const recipeNameById = new Map(recipes.map((r) => [r.id, r.name]));

  const byWeekday = new Map<number, SalesDayInput[]>();
  for (const day of salesDays) {
    const weekday = new Date(`${day.date}T00:00:00`).getDay();
    if (!byWeekday.has(weekday)) byWeekday.set(weekday, []);
    byWeekday.get(weekday)!.push(day);
  }

  const results: ForecastDayResult[] = [];
  for (let i = 1; i <= daysAhead; i++) {
    const target = new Date(today);
    target.setDate(target.getDate() + i);
    const weekday = target.getDay();
    const history = byWeekday.get(weekday) ?? [];
    const sampleSize = history.length;

    let avgRevenue: number | null = null;
    let topItems: ForecastItem[] = [];

    if (sampleSize > 0) {
      const totalRevenue = history.reduce((sum, d) => sum + d.food + d.drink + d.delivery, 0);
      avgRevenue = Math.round((totalRevenue / sampleSize) * 100) / 100;

      const portionSums = new Map<string, number>();
      for (const day of history) {
        for (const [recipeId, qty] of Object.entries(day.portions)) {
          portionSums.set(recipeId, (portionSums.get(recipeId) ?? 0) + qty);
        }
      }
      topItems = Array.from(portionSums.entries())
        .map(([recipeId, sum]) => ({
          name: recipeNameById.get(recipeId) ?? "—",
          avgPortions: Math.round((sum / sampleSize) * 10) / 10,
        }))
        .filter((item) => item.avgPortions > 0)
        .sort((a, b) => b.avgPortions - a.avgPortions)
        .slice(0, 5);
    }

    results.push({
      date: target.toISOString().slice(0, 10),
      weekday,
      sampleSize,
      avgRevenue,
      topItems,
    });
  }

  return results;
}
