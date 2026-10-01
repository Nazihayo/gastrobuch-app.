import { describe, expect, it } from "vitest";
import { computeReceipt } from "./receipts";

describe("computeReceipt", () => {
  it("splits VAT by food (7%) and drink (19%) for Germany", () => {
    const result = computeReceipt(
      [
        { name: "Pizza", quantity: 2, unitPrice: 9.5, vatCategory: "food" },
        { name: "Cola", quantity: 1, unitPrice: 2.5, vatCategory: "drink" },
      ],
      "de"
    );

    expect(result.total).toBeCloseTo(21.5, 2);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      name: "Pizza",
      quantity: 2,
      unit_price: 9.5,
      vat_category: "food",
      line_total: 19,
    });
    // 19 * 7 / 107
    expect(result.vatBreakdown["7"]).toBeCloseTo(1.24, 2);
    // 2.5 * 19 / 119
    expect(result.vatBreakdown["19"]).toBeCloseTo(0.4, 2);
  });

  it("merges multiple lines into the same VAT rate bucket", () => {
    const result = computeReceipt(
      [
        { name: "Pizza", quantity: 1, unitPrice: 10, vatCategory: "food" },
        { name: "Pasta", quantity: 1, unitPrice: 10, vatCategory: "food" },
      ],
      "de"
    );

    expect(Object.keys(result.vatBreakdown)).toEqual(["7"]);
    // 20 * 7 / 107
    expect(result.vatBreakdown["7"]).toBeCloseTo(1.31, 2);
  });

  it("uses a single flat rate for non-split-VAT countries regardless of category", () => {
    const result = computeReceipt(
      [
        { name: "Burger", quantity: 1, unitPrice: 10, vatCategory: "food" },
        { name: "Soda", quantity: 1, unitPrice: 5, vatCategory: "drink" },
      ],
      "ae"
    );

    expect(Object.keys(result.vatBreakdown)).toEqual(["5"]);
    expect(result.total).toBeCloseTo(15, 2);
  });

  it("returns an empty breakdown and zero total for no lines", () => {
    const result = computeReceipt([], "de");
    expect(result.items).toEqual([]);
    expect(result.vatBreakdown).toEqual({});
    expect(result.total).toBe(0);
  });
});
