import { describe, expect, it } from "vitest";
import { calcSale } from "./calculations";

// These expected values are the actual output of calcSale as ported from
// the original prototype (reference/daftar-app.html) — this test locks
// that behavior in place. A failure here means the tax math changed, not
// that the test is wrong; re-verify against the reference before updating
// the expected numbers.
describe("calcSale", () => {
  it("splits VAT by food/drink rate for Germany", () => {
    const r = calcSale({ food: 100, drink: 50, delivery: 0, commissionPct: 0, purchases: 30 }, "de");
    expect(r.total).toBe(150);
    expect(r.vatSalesTotal).toBeCloseTo(14.52524935, 6);
    expect(r.vatPurch).toBeCloseTo(1.96261682, 6);
    expect(r.vatDue).toBeCloseTo(12.56263253, 6);
    expect(r.net).toBeCloseTo(94.87473494, 6);
  });

  it("applies delivery commission and taxes delivery at the food rate", () => {
    const r = calcSale(
      { food: 0, drink: 0, delivery: 200, commissionPct: 30, purchases: 0 },
      "de"
    );
    expect(r.commissionAmount).toBe(60);
    expect(r.vatSalesTotal).toBeCloseTo(13.08411215, 6);
    expect(r.net).toBeCloseTo(113.8317757, 5);
  });

  it("uses a single flat VAT rate for Saudi Arabia", () => {
    const r = calcSale({ food: 100, drink: 50, delivery: 0, commissionPct: 0, purchases: 0 }, "sa");
    expect(r.vatSalesTotal).toBeCloseTo(19.56521739, 6);
    expect(r.net).toBeCloseTo(110.86956522, 5);
  });

  it("uses the UK's flat 20% rate", () => {
    const r = calcSale({ food: 120, drink: 0, delivery: 0, commissionPct: 0, purchases: 60 }, "uk");
    expect(r.vatSalesTotal).toBe(20);
    expect(r.vatPurch).toBe(10);
    expect(r.vatDue).toBe(10);
    expect(r.net).toBe(40);
  });

  it("never lets VAT due go negative when input VAT exceeds output VAT", () => {
    const r = calcSale({ food: 10, drink: 0, delivery: 0, commissionPct: 0, purchases: 1000 }, "de");
    expect(r.vatDue).toBe(0);
  });

  it("treats missing fields as zero", () => {
    const r = calcSale({}, "de");
    expect(r).toEqual({
      total: 0,
      vatSalesTotal: 0,
      vatPurch: 0,
      vatDue: 0,
      net: 0,
      commissionAmount: 0,
      delivery: 0,
    });
  });
});
