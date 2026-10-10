import { describe, expect, it } from "vitest";
import { pickCheapestSupplier } from "./autoReorder";

describe("pickCheapestSupplier", () => {
  it("picks the lowest price among several suppliers", () => {
    const result = pickCheapestSupplier([
      { supplierId: "a", supplierName: "A", supplierEmail: "a@x.com", price: 5, reorderQuantity: 10 },
      { supplierId: "b", supplierName: "B", supplierEmail: "b@x.com", price: 3, reorderQuantity: 10 },
      { supplierId: "c", supplierName: "C", supplierEmail: "c@x.com", price: 4, reorderQuantity: 10 },
    ]);
    expect(result?.supplierId).toBe("b");
  });

  it("ignores suppliers without an email on file", () => {
    const result = pickCheapestSupplier([
      { supplierId: "a", supplierName: "A", supplierEmail: "", price: 1, reorderQuantity: 10 },
      { supplierId: "b", supplierName: "B", supplierEmail: "b@x.com", price: 3, reorderQuantity: 10 },
    ]);
    expect(result?.supplierId).toBe("b");
  });

  it("returns null when there are no options", () => {
    expect(pickCheapestSupplier([])).toBeNull();
  });

  it("returns null when no supplier has an email", () => {
    const result = pickCheapestSupplier([
      { supplierId: "a", supplierName: "A", supplierEmail: "", price: 1, reorderQuantity: 10 },
    ]);
    expect(result).toBeNull();
  });
});
