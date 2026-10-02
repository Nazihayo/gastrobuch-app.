import { describe, expect, it } from "vitest";
import {
  detectLongShifts,
  detectMinijobCapRisk,
  detectMissingRestDay,
  detectShortRestPeriods,
  type ShiftInput,
} from "./scheduleCompliance";

describe("detectLongShifts", () => {
  it("flags a shift longer than the max hours", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "08:00", endTime: "19:00" },
    ];
    const findings = detectLongShifts(shifts);
    expect(findings).toHaveLength(1);
    expect(findings[0].hours).toBe(11);
  });

  it("does not flag a normal shift", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "08:00", endTime: "16:00" },
    ];
    expect(detectLongShifts(shifts)).toHaveLength(0);
  });

  it("handles a shift crossing midnight", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "20:00", endTime: "07:00" },
    ];
    const findings = detectLongShifts(shifts);
    expect(findings[0].hours).toBe(11);
  });
});

describe("detectShortRestPeriods", () => {
  it("flags less than 11 hours between a late shift and an early one the next day", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "14:00", endTime: "23:00" },
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-11", startTime: "08:00", endTime: "16:00" },
    ];
    const findings = detectShortRestPeriods(shifts);
    expect(findings).toHaveLength(1);
    expect(findings[0].restHours).toBe(9);
  });

  it("does not flag a normal overnight gap", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "09:00", endTime: "17:00" },
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-11", startTime: "09:00", endTime: "17:00" },
    ];
    expect(detectShortRestPeriods(shifts)).toHaveLength(0);
  });

  it("ignores shifts from different staff members", () => {
    const shifts: ShiftInput[] = [
      { staffMemberId: "a", staffName: "Anna", date: "2026-09-10", startTime: "14:00", endTime: "23:00" },
      { staffMemberId: "b", staffName: "Ben", date: "2026-09-11", startTime: "08:00", endTime: "16:00" },
    ];
    expect(detectShortRestPeriods(shifts)).toHaveLength(0);
  });
});

describe("detectMissingRestDay", () => {
  it("flags 7 consecutive working days", () => {
    const shifts: ShiftInput[] = Array.from({ length: 7 }, (_, i) => ({
      staffMemberId: "a",
      staffName: "Anna",
      date: `2026-09-${String(10 + i).padStart(2, "0")}`,
      startTime: "09:00",
      endTime: "17:00",
    }));
    const findings = detectMissingRestDay(shifts);
    expect(findings).toHaveLength(1);
    expect(findings[0].consecutiveDays).toBe(7);
  });

  it("does not flag 6 consecutive days with a rest day after", () => {
    const shifts: ShiftInput[] = Array.from({ length: 6 }, (_, i) => ({
      staffMemberId: "a",
      staffName: "Anna",
      date: `2026-09-${String(10 + i).padStart(2, "0")}`,
      startTime: "09:00",
      endTime: "17:00",
    }));
    expect(detectMissingRestDay(shifts)).toHaveLength(0);
  });
});

describe("detectMinijobCapRisk", () => {
  it("flags a staff member projected to earn over the cap", () => {
    const shifts: ShiftInput[] = Array.from({ length: 10 }, (_, i) => ({
      staffMemberId: "a",
      staffName: "Anna",
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      startTime: "09:00",
      endTime: "15:00",
    }));
    const findings = detectMinijobCapRisk(shifts, new Map([["a", 13]]), 603);
    expect(findings).toHaveLength(1);
    expect(findings[0].estimatedMonthlyEarnings).toBe(780);
  });

  it("does not flag a staff member under the cap", () => {
    const shifts: ShiftInput[] = Array.from({ length: 5 }, (_, i) => ({
      staffMemberId: "a",
      staffName: "Anna",
      date: `2026-09-${String(i + 1).padStart(2, "0")}`,
      startTime: "09:00",
      endTime: "17:00",
    }));
    const findings = detectMinijobCapRisk(shifts, new Map([["a", 13]]), 603);
    expect(findings).toHaveLength(0);
  });
});
