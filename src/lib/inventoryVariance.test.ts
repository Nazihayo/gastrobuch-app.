import { describe, expect, it } from "vitest";
import { computeInventoryVariance } from "./inventoryVariance";

const items = [{ id: "item-1", name: "Cheese", unit: "kg" }];

describe("computeInventoryVariance", () => {
  it("flags an item whose actual usage clearly exceeds theoretical usage", () => {
    const counts = new Map([
      [
        "item-1",
        [
          { remaining: 10, countedAt: "2026-10-01T08:00:00Z" },
          { remaining: 2, countedAt: "2026-10-10T08:00:00Z" },
        ],
      ],
    ]);
    const links = new Map([["item-1", [{ recipeName: "Pizza Margherita", quantityPerPortion: 0.2 }]]]);
    const orders = [
      { recipeName: "Pizza Margherita", quantity: 10, orderedAt: "2026-10-05T12:00:00Z" }, // 2kg theoretical
    ];

    const findings = computeInventoryVariance(items, counts, links, orders);
    expect(findings).toHaveLength(1);
    expect(findings[0].actualUsed).toBe(8);
    expect(findings[0].theoreticalUsed).toBe(2);
    expect(findings[0].topDish).toBe("Pizza Margherita");
  });

  it("does not flag an item whose actual usage roughly matches theoretical usage", () => {
    const counts = new Map([
      [
        "item-1",
        [
          { remaining: 10, countedAt: "2026-10-01T08:00:00Z" },
          { remaining: 8, countedAt: "2026-10-10T08:00:00Z" },
        ],
      ],
    ]);
    const links = new Map([["item-1", [{ recipeName: "Pizza Margherita", quantityPerPortion: 0.2 }]]]);
    const orders = [{ recipeName: "Pizza Margherita", quantity: 10, orderedAt: "2026-10-05T12:00:00Z" }];

    expect(computeInventoryVariance(items, counts, links, orders)).toHaveLength(0);
  });

  it("skips an item where a restock happened in between (no clean window)", () => {
    const counts = new Map([
      [
        "item-1",
        [
          { remaining: 2, countedAt: "2026-10-01T08:00:00Z" },
          { remaining: 10, countedAt: "2026-10-05T08:00:00Z" }, // restock
          { remaining: 9, countedAt: "2026-10-10T08:00:00Z" },
        ],
      ],
    ]);
    const links = new Map([["item-1", [{ recipeName: "Pizza Margherita", quantityPerPortion: 0.2 }]]]);
    const orders = [{ recipeName: "Pizza Margherita", quantity: 100, orderedAt: "2026-10-07T12:00:00Z" }];

    // Clean window is only 10-05 -> 10-10 (1kg used), well within theoretical range for 100 portions worth
    expect(computeInventoryVariance(items, counts, links, orders)).toHaveLength(0);
  });

  it("skips an item with only one count (no window to compare)", () => {
    const counts = new Map([["item-1", [{ remaining: 5, countedAt: "2026-10-01T08:00:00Z" }]]]);
    const links = new Map([["item-1", [{ recipeName: "Pizza Margherita", quantityPerPortion: 0.2 }]]]);
    expect(computeInventoryVariance(items, counts, links, [])).toHaveLength(0);
  });

  it("skips an item that isn't linked to any recipe", () => {
    const counts = new Map([
      [
        "item-1",
        [
          { remaining: 10, countedAt: "2026-10-01T08:00:00Z" },
          { remaining: 1, countedAt: "2026-10-10T08:00:00Z" },
        ],
      ],
    ]);
    expect(computeInventoryVariance(items, counts, new Map(), [])).toHaveLength(0);
  });
});
