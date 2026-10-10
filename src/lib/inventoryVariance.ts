export type InventoryCountInput = { remaining: number; countedAt: string };
export type RecipeLinkInput = { recipeName: string; quantityPerPortion: number };
export type OrderPortionInput = { recipeName: string; quantity: number; orderedAt: string };

export type VarianceFinding = {
  inventoryItemId: string;
  itemName: string;
  unit: string;
  windowStart: string;
  windowEnd: string;
  actualUsed: number;
  theoreticalUsed: number;
  topDish: string | null;
};

// Minimum absolute gap (in the item's own unit) before a variance is worth
// surfacing at all — avoids flagging noise from rounding or a single
// imprecise manual count.
const MIN_ABSOLUTE_GAP = 0.5;

function findCleanTrailingWindow(
  counts: InventoryCountInput[]
): { start: InventoryCountInput; end: InventoryCountInput } | null {
  if (counts.length < 2) return null;
  const sorted = [...counts].sort(
    (a, b) => new Date(a.countedAt).getTime() - new Date(b.countedAt).getTime()
  );

  // Walk backward from the most recent count, extending the window only
  // while stock is non-increasing (never went up) — a restock between two
  // counts would make a simple start-minus-end diff overstate consumption,
  // so that count becomes the new window start instead.
  let startIndex = sorted.length - 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (sorted[i - 1].remaining >= sorted[i].remaining) {
      startIndex = i - 1;
    } else {
      break;
    }
  }

  if (startIndex === sorted.length - 1) return null;
  return { start: sorted[startIndex], end: sorted[sorted.length - 1] };
}

// Flags a specific inventory item whose stock dropped more than what the
// recipes actually sold in the same window would predict, and names the
// dish most likely responsible — the dish-level, software-only, no-camera
// suggestion no platform checked in this round's research offers.
export function computeInventoryVariance(
  items: { id: string; name: string; unit: string }[],
  countsByItem: Map<string, InventoryCountInput[]>,
  linksByItem: Map<string, RecipeLinkInput[]>,
  orderPortions: OrderPortionInput[],
  toleranceRatio = 1.15
): VarianceFinding[] {
  const findings: VarianceFinding[] = [];

  for (const item of items) {
    const counts = countsByItem.get(item.id) ?? [];
    const window = findCleanTrailingWindow(counts);
    if (!window) continue;

    const actualUsed = window.start.remaining - window.end.remaining;
    if (actualUsed <= 0) continue;

    const links = linksByItem.get(item.id) ?? [];
    if (links.length === 0) continue;

    const windowStartMs = new Date(window.start.countedAt).getTime();
    const windowEndMs = new Date(window.end.countedAt).getTime();

    const usageByDish = new Map<string, number>();
    for (const portion of orderPortions) {
      const orderedMs = new Date(portion.orderedAt).getTime();
      if (orderedMs < windowStartMs || orderedMs > windowEndMs) continue;
      const link = links.find((l) => l.recipeName === portion.recipeName);
      if (!link) continue;
      usageByDish.set(
        portion.recipeName,
        (usageByDish.get(portion.recipeName) ?? 0) + link.quantityPerPortion * portion.quantity
      );
    }

    const theoreticalUsed = Array.from(usageByDish.values()).reduce((sum, v) => sum + v, 0);
    const gap = actualUsed - theoreticalUsed;

    if (gap < MIN_ABSOLUTE_GAP) continue;
    if (theoreticalUsed > 0 && actualUsed < theoreticalUsed * toleranceRatio) continue;

    let topDish: string | null = null;
    let topDishUsage = -1;
    for (const [dish, usage] of usageByDish) {
      if (usage > topDishUsage) {
        topDish = dish;
        topDishUsage = usage;
      }
    }

    findings.push({
      inventoryItemId: item.id,
      itemName: item.name,
      unit: item.unit,
      windowStart: window.start.countedAt,
      windowEnd: window.end.countedAt,
      actualUsed: Math.round(actualUsed * 100) / 100,
      theoreticalUsed: Math.round(theoreticalUsed * 100) / 100,
      topDish,
    });
  }

  return findings;
}
