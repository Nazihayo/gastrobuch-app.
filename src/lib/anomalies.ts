export type CancellationRecord = {
  userId: string;
  userLabel: string;
  orderId: string;
  orderCreatedAt: string;
  cancelledAt: string;
  totalEstimate: number;
};

export type StaffCancellationSummary = {
  userId: string;
  userLabel: string;
  count: number;
  totalAmount: number;
  fastVoidCount: number;
};

// Ranks team members by how many orders they cancelled — not an accusation
// on its own, but the classic "ring up, then void" fraud pattern is a
// cancellation that happens within a couple of minutes of the order being
// placed, which fastVoidCount isolates within that ranking.
export function summarizeCancellations(
  records: CancellationRecord[],
  fastVoidMinutes = 2
): StaffCancellationSummary[] {
  const byUser = new Map<string, StaffCancellationSummary>();

  for (const r of records) {
    const minutesToCancel =
      (new Date(r.cancelledAt).getTime() - new Date(r.orderCreatedAt).getTime()) / 60000;

    const entry = byUser.get(r.userId) ?? {
      userId: r.userId,
      userLabel: r.userLabel,
      count: 0,
      totalAmount: 0,
      fastVoidCount: 0,
    };
    entry.count += 1;
    entry.totalAmount += r.totalEstimate;
    if (minutesToCancel >= 0 && minutesToCancel <= fastVoidMinutes) {
      entry.fastVoidCount += 1;
    }
    byUser.set(r.userId, entry);
  }

  return Array.from(byUser.values()).sort((a, b) => b.count - a.count);
}

export type DailyPaymentSplit = { date: string; cash: number; card: number };
export type CashRatioAnomaly = { date: string; cashRatio: number; avgCashRatio: number };

// Flags a day whose cash share of total receipts is well above the
// restaurant's own trailing average — not proof of anything by itself, but
// a pattern worth a manual register check (skimming shows up as more cash
// transactions quietly replacing card ones).
export function detectCashRatioAnomalies(
  days: DailyPaymentSplit[],
  minDailyTotal = 20,
  thresholdMultiplier = 1.5,
  minAbsoluteGap = 0.15
): CashRatioAnomaly[] {
  const ratios = days
    .map((d) => ({
      date: d.date,
      total: d.cash + d.card,
      ratio: d.cash + d.card > 0 ? d.cash / (d.cash + d.card) : 0,
    }))
    .filter((d) => d.total >= minDailyTotal);

  if (ratios.length < 5) return [];

  const avg = ratios.reduce((sum, d) => sum + d.ratio, 0) / ratios.length;
  if (avg <= 0) return [];

  const anomalies: CashRatioAnomaly[] = [];
  for (const d of ratios) {
    if (d.ratio >= avg * thresholdMultiplier && d.ratio - avg >= minAbsoluteGap) {
      anomalies.push({ date: d.date, cashRatio: d.ratio, avgCashRatio: avg });
    }
  }
  return anomalies;
}
