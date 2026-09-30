import { describe, expect, it } from "vitest";
import { computeHealth } from "./health";

describe("computeHealth", () => {
  it("stays at 100/green with no data", () => {
    const r = computeHealth({
      totalSales: 0,
      wages: 0,
      staff: [],
      inventory: [],
      country: "de",
      locale: "de",
    });
    expect(r).toEqual({ score: 100, emoji: "🟢", reasons: [], alerts: [] });
  });

  it("deducts 20 and alerts when labor cost exceeds 35% of sales", () => {
    const r = computeHealth({
      totalSales: 1000,
      wages: 400,
      staff: [],
      inventory: [],
      country: "de",
      locale: "de",
    });
    expect(r.score).toBe(80);
    expect(r.alerts).toHaveLength(1);
    expect(r.alerts[0].tab).toBe("staff");
  });

  it("deducts 8 with no alert for labor cost between 30% and 35%", () => {
    const r = computeHealth({
      totalSales: 1000,
      wages: 320,
      staff: [],
      inventory: [],
      country: "de",
      locale: "de",
    });
    expect(r.score).toBe(92);
    expect(r.alerts).toHaveLength(0);
  });

  it("deducts 10 per staff member over the minijob limit", () => {
    const r = computeHealth({
      totalSales: 1000,
      wages: 200,
      staff: [{ name: "Ali", hours: 100, rate: 7 }],
      inventory: [],
      country: "de",
      locale: "de",
    });
    expect(r.score).toBe(90);
    expect(r.alerts).toEqual([{ tab: "staff", text: expect.stringContaining("Ali") }]);
  });

  it("does not check the minijob limit for countries without one", () => {
    const r = computeHealth({
      totalSales: 1000,
      wages: 200,
      staff: [{ name: "Ali", hours: 1000, rate: 100 }],
      inventory: [],
      country: "sa",
      locale: "de",
    });
    expect(r.alerts).toHaveLength(0);
  });

  it("flags inventory at or below 15% of what's needed, capped at -20", () => {
    const criticalItem = { name: "A", unit: "kg", needed: 10, remaining: 1 };
    const r = computeHealth({
      totalSales: 1000,
      wages: 200,
      staff: [],
      inventory: Array(5).fill(criticalItem),
      country: "de",
      locale: "de",
    });
    expect(r.score).toBe(80); // 100 - min(5*5, 20)
    expect(r.alerts).toHaveLength(5);
  });

  it("does not flag inventory above the 15% threshold", () => {
    const r = computeHealth({
      totalSales: 1000,
      wages: 200,
      staff: [],
      inventory: [{ name: "A", unit: "kg", needed: 10, remaining: 9 }],
      country: "de",
      locale: "de",
    });
    expect(r.alerts).toHaveLength(0);
  });

  it("clamps the score at 0 and reports red", () => {
    const badStaff = { name: "X", hours: 100, rate: 7 };
    const criticalItem = { name: "A", unit: "kg", needed: 10, remaining: 0 };
    const r = computeHealth({
      totalSales: 1000,
      wages: 500,
      staff: Array(10).fill(badStaff),
      inventory: Array(10).fill(criticalItem),
      country: "de",
      locale: "de",
    });
    expect(r.score).toBe(0);
    expect(r.emoji).toBe("🔴");
  });
});
