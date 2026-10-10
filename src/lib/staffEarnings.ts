function minutesSinceMidnight(time: string, dayOffset = 0): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m + dayOffset * 24 * 60;
}

// Hours of a shift that have elapsed by `now` (same calendar day as the
// shift's `date`), clamped to [0, full shift length]. A shift that crosses
// midnight (end < start) is treated as ending the next day, matching
// shiftHours() in lib/tips.ts.
export function shiftElapsedHours(startTime: string, endTime: string, now: Date): number {
  const startMin = minutesSinceMidnight(startTime);
  let endMin = minutesSinceMidnight(endTime);
  if (endMin < startMin) endMin += 24 * 60;
  const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

  const elapsedMin = Math.min(Math.max(nowMin - startMin, 0), endMin - startMin);
  return Math.round((elapsedMin / 60) * 100) / 100;
}

export function shiftLengthHours(startTime: string, endTime: string): number {
  const startMin = minutesSinceMidnight(startTime);
  let endMin = minutesSinceMidnight(endTime);
  if (endMin < startMin) endMin += 24 * 60;
  return Math.round(((endMin - startMin) / 60) * 100) / 100;
}

// Average tip amount earned per hour worked, from a set of historical
// payouts. Returns 0 (not a guess) when there is no hours signal at all.
export function averageTipPerHour(payouts: { hours: number; amount: number }[]): number {
  const totalHours = payouts.reduce((sum, p) => sum + p.hours, 0);
  if (totalHours <= 0) return 0;
  const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
  return Math.round((totalAmount / totalHours) * 100) / 100;
}
