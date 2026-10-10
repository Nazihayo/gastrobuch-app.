import type { ForecastDayResult } from "./forecast";
import type { ShiftInput } from "./scheduleCompliance";

export type StaffEligibility = {
  staffMemberId: string;
  staffName: string;
  eligible: boolean;
  reason?: "consecutive_days" | "tight_rest";
};

export type DayStaffingRecommendation = {
  date: string;
  recommendedHeadcount: number;
  ineligibleStaff: StaffEligibility[];
};

// A rough, explainable rule of thumb (revenue ÷ a per-staff target), not a
// labor-cost optimizer — same "plain and sanity-checkable" philosophy as
// computeForecast. Owners can't currently tune this from the UI; it's a
// reasonable default for a single shift's worth of staffing.
const DEFAULT_REVENUE_PER_STAFF = 300;

// How many hours before a day's first shift we assume staffing starts, used
// only to flag a "double-check this person's rest" warning — the real
// planned start time for a NOT-YET-SCHEDULED shift isn't known yet, so this
// is a prompt to verify, not a hard block the way detectShortRestPeriods is
// for shifts that already exist.
const ASSUMED_SHIFT_START_HOUR = 9;

function toMidnightUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

// Fuses the existing sales forecast (computeForecast) with the existing
// ArbZG rest/consecutive-day rules (scheduleCompliance) into ONE
// recommendation per upcoming day — "Friday needs ~4 staff, and here's who
// is and isn't actually free to work it" — instead of a headcount guess and
// a compliance warning living on two separate screens. No staffing-forecast
// platform checked in this round's research (Fourth/HotSchedules, Deputy,
// 7shifts, Sling, Ramco) fuses jurisdiction-specific labor-law constraints
// into the same recommendation as the demand forecast itself.
export function recommendStaffing(
  forecastDays: ForecastDayResult[],
  existingShifts: ShiftInput[],
  staff: { id: string; name: string }[],
  revenuePerStaff = DEFAULT_REVENUE_PER_STAFF
): DayStaffingRecommendation[] {
  const shiftsByStaff = new Map<string, ShiftInput[]>();
  for (const s of existingShifts) {
    if (!shiftsByStaff.has(s.staffMemberId)) shiftsByStaff.set(s.staffMemberId, []);
    shiftsByStaff.get(s.staffMemberId)!.push(s);
  }

  return forecastDays.map((day) => {
    const recommendedHeadcount =
      day.avgRevenue != null ? Math.max(1, Math.round(day.avgRevenue / revenuePerStaff)) : 0;

    const ineligibleStaff: StaffEligibility[] = [];

    for (const member of staff) {
      const memberShifts = (shiftsByStaff.get(member.id) ?? [])
        .slice()
        .sort((a, b) => a.date.localeCompare(b.date));

      // §11 ArbZG: would working this day extend a run of worked days
      // (including today) past 6 consecutive days?
      const workedDates = new Set(memberShifts.map((s) => s.date));
      workedDates.add(day.date);
      const sortedDates = Array.from(workedDates).sort();
      let streak = 1;
      let maxStreak = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diffDays =
          (toMidnightUtc(sortedDates[i]).getTime() - toMidnightUtc(sortedDates[i - 1]).getTime()) / 86400000;
        streak = diffDays === 1 ? streak + 1 : 1;
        maxStreak = Math.max(maxStreak, streak);
      }
      if (maxStreak > 6) {
        ineligibleStaff.push({
          staffMemberId: member.id,
          staffName: member.name,
          eligible: false,
          reason: "consecutive_days",
        });
        continue;
      }

      // §5 ArbZG: at least 11h rest since their most recent shift before
      // this date, assuming a typical start time for the new one.
      const previousShift = memberShifts.filter((s) => s.date < day.date).at(-1);
      if (previousShift) {
        const prevStart = new Date(`${previousShift.date}T${previousShift.startTime}:00Z`);
        let prevEnd = new Date(`${previousShift.date}T${previousShift.endTime}:00Z`);
        if (prevEnd <= prevStart) prevEnd = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);

        const assumedStart = toMidnightUtc(day.date);
        assumedStart.setUTCHours(ASSUMED_SHIFT_START_HOUR);
        const restHours = (assumedStart.getTime() - prevEnd.getTime()) / 3600000;
        if (restHours >= 0 && restHours < 11) {
          ineligibleStaff.push({
            staffMemberId: member.id,
            staffName: member.name,
            eligible: false,
            reason: "tight_rest",
          });
        }
      }
    }

    return { date: day.date, recommendedHeadcount, ineligibleStaff };
  });
}
