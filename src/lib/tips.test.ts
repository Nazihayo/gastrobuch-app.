import { describe, expect, it } from "vitest";
import { distributeTips, type TipShift, type TipStaffMember } from "./tips";

const staff: TipStaffMember[] = [
  { id: "a", name: "Anna" },
  { id: "b", name: "Ben" },
  { id: "c", name: "Clara" },
];

describe("distributeTips", () => {
  it("splits proportionally to hours worked in the period", () => {
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-09-10", startTime: "10:00", endTime: "18:00" }, // 8h
      { staffMemberId: "b", date: "2026-09-11", startTime: "10:00", endTime: "14:00" }, // 4h
    ];
    const payouts = distributeTips(staff, shifts, "2026-09-01", "2026-09-30", 120, "hours");
    expect(payouts).toEqual([
      { staffMemberId: "a", staffName: "Anna", hours: 8, amount: 80 },
      { staffMemberId: "b", staffName: "Ben", hours: 4, amount: 40 },
    ]);
  });

  it("splits evenly across everyone who worked when method is equal", () => {
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-09-10", startTime: "10:00", endTime: "18:00" },
      { staffMemberId: "b", date: "2026-09-11", startTime: "10:00", endTime: "12:00" },
    ];
    const payouts = distributeTips(staff, shifts, "2026-09-01", "2026-09-30", 100, "equal");
    expect(payouts.map((p) => p.amount)).toEqual([50, 50]);
  });

  it("excludes staff with no shifts in the period", () => {
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-09-10", startTime: "10:00", endTime: "18:00" },
    ];
    const payouts = distributeTips(staff, shifts, "2026-09-01", "2026-09-30", 50, "hours");
    expect(payouts).toHaveLength(1);
    expect(payouts[0].staffMemberId).toBe("a");
  });

  it("ignores shifts outside the given period", () => {
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-08-15", startTime: "10:00", endTime: "18:00" },
    ];
    const payouts = distributeTips(staff, shifts, "2026-09-01", "2026-09-30", 50, "hours");
    expect(payouts).toHaveLength(0);
  });

  it("handles a shift crossing midnight", () => {
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-09-10", startTime: "22:00", endTime: "02:00" },
    ];
    const payouts = distributeTips(staff, shifts, "2026-09-01", "2026-09-30", 40, "hours");
    expect(payouts[0].hours).toBe(4);
    expect(payouts[0].amount).toBe(40);
  });

  it("distributes the full pool despite rounding, by correcting the largest share", () => {
    const threeWayStaff: TipStaffMember[] = [
      { id: "a", name: "Anna" },
      { id: "b", name: "Ben" },
      { id: "c", name: "Clara" },
    ];
    const shifts: TipShift[] = [
      { staffMemberId: "a", date: "2026-09-10", startTime: "10:00", endTime: "11:00" },
      { staffMemberId: "b", date: "2026-09-10", startTime: "10:00", endTime: "11:00" },
      { staffMemberId: "c", date: "2026-09-10", startTime: "10:00", endTime: "11:00" },
    ];
    const payouts = distributeTips(threeWayStaff, shifts, "2026-09-01", "2026-09-30", 10, "equal");
    const sum = payouts.reduce((s, p) => s + p.amount, 0);
    expect(sum).toBe(10);
  });

  it("returns an empty list when nobody worked in the period", () => {
    expect(distributeTips(staff, [], "2026-09-01", "2026-09-30", 100, "hours")).toEqual([]);
  });
});
