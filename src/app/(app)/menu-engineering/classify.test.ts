import { describe, expect, it } from "vitest";
import { classify, type MenuItem } from "./MenuEngineeringView";

// Matches the sample already eyeballed in the browser during development:
// Schnitzel (high margin, high volume) -> star, Trüffel-Risotto (high
// margin, barely sold) -> puzzle, Currywurst (low margin, high volume) ->
// plowhorse, Alter Salat (low margin, barely sold) -> dog.
describe("classify", () => {
  const items: MenuItem[] = [
    { id: "1", name: "Schnitzel", marginPct: 70, portionsSold: 120 },
    { id: "2", name: "Trüffel-Risotto", marginPct: 75, portionsSold: 5 },
    { id: "3", name: "Currywurst", marginPct: 20, portionsSold: 150 },
    { id: "4", name: "Alter Salat", marginPct: 15, portionsSold: 3 },
  ];
  const result = classify(items);

  it("classifies a popular, above-average-margin dish as a star", () => {
    expect(result.get("1")).toBe("star");
  });

  it("classifies a high-margin but rarely-sold dish as a puzzle", () => {
    expect(result.get("2")).toBe("puzzle");
  });

  it("classifies a popular but low-margin dish as a plowhorse", () => {
    expect(result.get("3")).toBe("plowhorse");
  });

  it("classifies a low-margin, low-volume dish as a dog", () => {
    expect(result.get("4")).toBe("dog");
  });

  it("treats a single item with any sales as a star (100% share meets its own average)", () => {
    const result = classify([{ id: "1", name: "Only Dish", marginPct: 10, portionsSold: 1 }]);
    expect(result.get("1")).toBe("star");
  });
});
