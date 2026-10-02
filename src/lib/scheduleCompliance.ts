export type ShiftInput = {
  staffMemberId: string;
  staffName: string;
  date: string;
  startTime: string;
  endTime: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function shiftHours(date: string, startTime: string, endTime: string): number {
  const start = toDateTime(date, startTime);
  let end = toDateTime(date, endTime);
  if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
  return (end.getTime() - start.getTime()) / 3600000;
}

export type LongShiftFinding = {
  staffMemberId: string;
  staffName: string;
  date: string;
  hours: number;
};

// German Arbeitszeitgesetz (§3 ArbZG) caps a working day at 10 hours even
// with the extension allowance (the normal limit is 8h) — a single shift
// past that is a hard ceiling, not a judgment call.
export function detectLongShifts(shifts: ShiftInput[], maxHours = 10): LongShiftFinding[] {
  return shifts
    .map((s) => ({ ...s, hours: shiftHours(s.date, s.startTime, s.endTime) }))
    .filter((s) => s.hours > maxHours)
    .map((s) => ({
      staffMemberId: s.staffMemberId,
      staffName: s.staffName,
      date: s.date,
      hours: round2(s.hours),
    }));
}

export type ShortRestFinding = {
  staffMemberId: string;
  staffName: string;
  date: string;
  previousDate: string;
  restHours: number;
};

// §5 ArbZG requires at least 11 uninterrupted hours of rest between the end
// of one shift and the start of the next.
export function detectShortRestPeriods(shifts: ShiftInput[], minRestHours = 11): ShortRestFinding[] {
  const byStaff = new Map<string, ShiftInput[]>();
  for (const s of shifts) {
    if (!byStaff.has(s.staffMemberId)) byStaff.set(s.staffMemberId, []);
    byStaff.get(s.staffMemberId)!.push(s);
  }

  const findings: ShortRestFinding[] = [];
  for (const staffShifts of byStaff.values()) {
    const sorted = [...staffShifts].sort(
      (a, b) => toDateTime(a.date, a.startTime).getTime() - toDateTime(b.date, b.startTime).getTime()
    );
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const prevStart = toDateTime(prev.date, prev.startTime);
      let prevEnd = toDateTime(prev.date, prev.endTime);
      if (prevEnd <= prevStart) prevEnd = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);
      const currStart = toDateTime(curr.date, curr.startTime);
      const restHours = (currStart.getTime() - prevEnd.getTime()) / 3600000;
      if (restHours >= 0 && restHours < minRestHours) {
        findings.push({
          staffMemberId: curr.staffMemberId,
          staffName: curr.staffName,
          date: curr.date,
          previousDate: prev.date,
          restHours: round2(restHours),
        });
      }
    }
  }
  return findings;
}

export type MissingRestDayFinding = {
  staffMemberId: string;
  staffName: string;
  consecutiveDays: number;
};

// §11 ArbZG requires at least one full rest day within every 7-day window —
// equivalent to never scheduling more than 6 consecutive working days.
export function detectMissingRestDay(
  shifts: ShiftInput[],
  maxConsecutiveDays = 6
): MissingRestDayFinding[] {
  const datesByStaff = new Map<string, Set<string>>();
  const nameByStaff = new Map<string, string>();
  for (const s of shifts) {
    if (!datesByStaff.has(s.staffMemberId)) datesByStaff.set(s.staffMemberId, new Set());
    datesByStaff.get(s.staffMemberId)!.add(s.date);
    nameByStaff.set(s.staffMemberId, s.staffName);
  }

  const findings: MissingRestDayFinding[] = [];
  for (const [staffMemberId, dateSet] of datesByStaff) {
    const dates = Array.from(dateSet).sort();
    let streak = 1;
    let maxStreak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00Z");
      const curr = new Date(dates[i] + "T00:00:00Z");
      const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
      streak = diffDays === 1 ? streak + 1 : 1;
      maxStreak = Math.max(maxStreak, streak);
    }
    if (maxStreak > maxConsecutiveDays) {
      findings.push({
        staffMemberId,
        staffName: nameByStaff.get(staffMemberId) ?? "",
        consecutiveDays: maxStreak,
      });
    }
  }
  return findings;
}

export type MinijobCapFinding = {
  staffMemberId: string;
  staffName: string;
  estimatedMonthlyEarnings: number;
  cap: number;
};

// A rough estimate from scheduled hours (summed across the whole month, not
// just the displayed week) × hourly rate — not the exact payroll figure,
// but enough to flag a Minijob-contract staff member on track to go over
// the tax-free earnings cap.
export function detectMinijobCapRisk(
  monthShifts: ShiftInput[],
  rateByStaff: Map<string, number>,
  cap: number
): MinijobCapFinding[] {
  const hoursByStaff = new Map<string, number>();
  const nameByStaff = new Map<string, string>();
  for (const s of monthShifts) {
    hoursByStaff.set(
      s.staffMemberId,
      (hoursByStaff.get(s.staffMemberId) ?? 0) + shiftHours(s.date, s.startTime, s.endTime)
    );
    nameByStaff.set(s.staffMemberId, s.staffName);
  }

  const findings: MinijobCapFinding[] = [];
  for (const [staffMemberId, hours] of hoursByStaff) {
    const rate = rateByStaff.get(staffMemberId) ?? 0;
    const estimatedMonthlyEarnings = round2(hours * rate);
    if (estimatedMonthlyEarnings > cap) {
      findings.push({
        staffMemberId,
        staffName: nameByStaff.get(staffMemberId) ?? "",
        estimatedMonthlyEarnings,
        cap,
      });
    }
  }
  return findings;
}
