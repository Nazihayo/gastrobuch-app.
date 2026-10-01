import { describe, expect, it } from "vitest";
import { computeForecast } from "./forecast";

// Thursday, 2026-10-01
const TODAY = new Date("2026-10-01T12:00:00");

describe("computeForecast", () => {
  it("averages revenue and portions across the same weekday", () => {
    const salesDays = [
      // Two previous Fridays (2026-09-25, 2026-09-18)
      { date: "2026-09-25", food: 100, drink: 20, delivery: 0, portions: { pizza: 10 } },
      { date: "2026-09-18", food: 80, drink: 20, delivery: 0, portions: { pizza: 6 } },
    ];
    const recipes = [{ id: "pizza", name: "Pizza Margherita" }];

    const result = computeForecast(salesDays, recipes, TODAY, 7);
    const friday = result.find((d) => d.weekday === 5);

    expect(friday).toBeDefined();
    expect(friday!.sampleSize).toBe(2);
    expect(friday!.avgRevenue).toBe(110); // (120 + 100) / 2
    expect(friday!.topItems).toEqual([{ name: "Pizza Margherita", avgPortions: 8 }]);
  });

  it("reports zero sample size for a weekday with no history", () => {
    const result = computeForecast([], [], TODAY, 7);
    expect(result).toHaveLength(7);
    for (const day of result) {
      expect(day.sampleSize).toBe(0);
      expect(day.avgRevenue).toBeNull();
      expect(day.topItems).toEqual([]);
    }
  });

  it("falls back to a placeholder name for a recipe that no longer exists", () => {
    const salesDays = [
      { date: "2026-09-25", food: 50, drink: 0, delivery: 0, portions: { "deleted-id": 3 } },
    ];
    const result = computeForecast(salesDays, [], TODAY, 7);
    const friday = result.find((d) => d.weekday === 5);
    expect(friday!.topItems).toEqual([{ name: "—", avgPortions: 3 }]);
  });

  it("ranks items by average portions, highest first, capped at 5", () => {
    const salesDays = [
      {
        date: "2026-09-25",
        food: 0,
        drink: 0,
        delivery: 0,
        portions: { a: 1, b: 5, c: 3, d: 2, e: 4, f: 10 },
      },
    ];
    const recipes = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, name: id }));
    const result = computeForecast(salesDays, recipes, TODAY, 7);
    const friday = result.find((d) => d.weekday === 5)!;

    expect(friday.topItems).toHaveLength(5);
    expect(friday.topItems.map((i) => i.name)).toEqual(["f", "b", "e", "c", "d"]);
  });
});
