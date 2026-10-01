export type TipStaffMember = { id: string; name: string };
export type TipShift = { staffMemberId: string; date: string; startTime: string; endTime: string };
export type TipSplitMethod = "hours" | "equal";

export type TipPayout = {
  staffMemberId: string;
  staffName: string;
  hours: number;
  amount: number;
};

function shiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const start = sh * 60 + sm;
  let end = eh * 60 + em;
  if (end < start) end += 24 * 60; // shift crosses midnight
  return (end - start) / 60;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Splits a tip pool either proportionally to hours actually worked in the
// period (from staff_shifts) or evenly across everyone who worked at least
// one shift. Staff with zero shifts in the period get nothing — there is no
// hours signal to base a share on.
export function distributeTips(
  staff: TipStaffMember[],
  shifts: TipShift[],
  periodStart: string,
  periodEnd: string,
  totalAmount: number,
  method: TipSplitMethod
): TipPayout[] {
  const hoursByStaff = new Map<string, number>();
  for (const shift of shifts) {
    if (shift.date < periodStart || shift.date > periodEnd) continue;
    const hours = shiftHours(shift.startTime, shift.endTime);
    hoursByStaff.set(shift.staffMemberId, (hoursByStaff.get(shift.staffMemberId) ?? 0) + hours);
  }

  const participants = staff.filter((s) => (hoursByStaff.get(s.id) ?? 0) > 0);
  if (participants.length === 0 || totalAmount <= 0) {
    return participants.map((s) => ({
      staffMemberId: s.id,
      staffName: s.name,
      hours: round2(hoursByStaff.get(s.id) ?? 0),
      amount: 0,
    }));
  }

  const totalHours = participants.reduce((sum, s) => sum + (hoursByStaff.get(s.id) ?? 0), 0);

  const payouts = participants.map((s) => {
    const hours = hoursByStaff.get(s.id) ?? 0;
    const share = method === "equal" ? 1 / participants.length : hours / totalHours;
    return {
      staffMemberId: s.id,
      staffName: s.name,
      hours: round2(hours),
      amount: round2(totalAmount * share),
    };
  });

  // Rounding can leave the sum a cent or two off the original total; correct
  // it on the largest payout so the pool is always fully distributed.
  const distributed = payouts.reduce((sum, p) => sum + p.amount, 0);
  const diff = round2(totalAmount - distributed);
  if (diff !== 0 && payouts.length > 0) {
    const largest = payouts.reduce((max, p) => (p.amount > max.amount ? p : max), payouts[0]);
    largest.amount = round2(largest.amount + diff);
  }

  return payouts;
}
