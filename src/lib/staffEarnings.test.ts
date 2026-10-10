import { describe, expect, it } from "vitest";
import { averageTipPerHour, shiftElapsedHours, shiftLengthHours } from "./staffEarnings";

describe("shiftElapsedHours", () => {
  it("is zero before the shift starts", () => {
    const now = new Date("2026-10-10T07:00:00Z");
    expect(shiftElapsedHours("09:00", "17:00", now)).toBe(0);
  });

  it("tracks elapsed hours mid-shift", () => {
    const now = new Date("2026-10-10T11:30:00Z");
    expect(shiftElapsedHours("09:00", "17:00", now)).toBe(2.5);
  });

  it("clamps at the shift length once it's over", () => {
    const now = new Date("2026-10-10T20:00:00Z");
    expect(shiftElapsedHours("09:00", "17:00", now)).toBe(8);
  });

  it("handles a shift that crosses midnight", () => {
    const now = new Date("2026-10-10T23:00:00Z");
    expect(shiftElapsedHours("22:00", "02:00", now)).toBe(1);
  });
});

describe("shiftLengthHours", () => {
  it("computes a same-day shift length", () => {
    expect(shiftLengthHours("09:00", "17:00")).toBe(8);
  });

  it("computes a shift that crosses midnight", () => {
    expect(shiftLengthHours("22:00", "02:00")).toBe(4);
  });
});

describe("averageTipPerHour", () => {
  it("returns 0 with no hours signal", () => {
    expect(averageTipPerHour([])).toBe(0);
    expect(averageTipPerHour([{ hours: 0, amount: 10 }])).toBe(0);
  });

  it("averages amount over hours across multiple payouts", () => {
    expect(
      averageTipPerHour([
        { hours: 4, amount: 20 },
        { hours: 6, amount: 40 },
      ])
    ).toBe(6);
  });
});
