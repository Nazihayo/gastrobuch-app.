import { describe, expect, it } from "vitest";
import { recommendStaffing } from "./staffingRecommendation";

const staff = [
  { id: "a", name: "Alex" },
  { id: "b", name: "Bea" },
];

describe("recommendStaffing", () => {
  it("recommends headcount proportional to forecasted revenue", () => {
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 3, avgRevenue: 900, topItems: [] }],
      [],
      staff
    );
    expect(result[0].recommendedHeadcount).toBe(3); // 900 / 300
  });

  it("recommends at least 1 staff member when there's any forecasted revenue", () => {
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 1, avgRevenue: 50, topItems: [] }],
      [],
      staff
    );
    expect(result[0].recommendedHeadcount).toBe(1);
  });

  it("recommends 0 when there's no forecast data at all", () => {
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 0, avgRevenue: null, topItems: [] }],
      [],
      staff
    );
    expect(result[0].recommendedHeadcount).toBe(0);
  });

  it("flags a staff member who would hit a 7th consecutive working day", () => {
    const sixDayRun = ["10", "11", "12", "13", "14", "15"].map((day) => ({
      staffMemberId: "a",
      staffName: "Alex",
      date: `2026-10-${day}`,
      startTime: "09:00",
      endTime: "17:00",
    }));
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 1, avgRevenue: 300, topItems: [] }],
      sixDayRun,
      staff
    );
    const day = result[0];
    expect(day.ineligibleStaff.some((s) => s.staffMemberId === "a" && s.reason === "consecutive_days")).toBe(
      true
    );
    expect(day.ineligibleStaff.some((s) => s.staffMemberId === "b")).toBe(false);
  });

  it("flags a staff member with less than 11 hours of rest before the assumed start time", () => {
    const lateShiftYesterday = [
      { staffMemberId: "a", staffName: "Alex", date: "2026-10-15", startTime: "14:00", endTime: "23:30" },
    ];
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 1, avgRevenue: 300, topItems: [] }],
      lateShiftYesterday,
      staff
    );
    expect(
      result[0].ineligibleStaff.some((s) => s.staffMemberId === "a" && s.reason === "tight_rest")
    ).toBe(true);
  });

  it("does not flag a staff member with ample rest before the assumed start time", () => {
    const earlyShiftYesterday = [
      { staffMemberId: "a", staffName: "Alex", date: "2026-10-15", startTime: "09:00", endTime: "17:00" },
    ];
    const result = recommendStaffing(
      [{ date: "2026-10-16", weekday: 5, sampleSize: 1, avgRevenue: 300, topItems: [] }],
      earlyShiftYesterday,
      staff
    );
    expect(result[0].ineligibleStaff.some((s) => s.staffMemberId === "a")).toBe(false);
  });
});
