export type SupplierPriceOption = {
  supplierId: string;
  supplierName: string;
  supplierEmail: string;
  price: number;
  reorderQuantity: number;
};

// Pure price comparison, kept separate from the DB/email side effects so
// it's trivially unit-testable — the actual "which supplier is cheapest"
// decision no platform checked in this round's research makes
// automatically.
export function pickCheapestSupplier(options: SupplierPriceOption[]): SupplierPriceOption | null {
  const withEmail = options.filter((o) => o.supplierEmail.trim() !== "");
  if (withEmail.length === 0) return null;
  return withEmail.reduce((cheapest, o) => (o.price < cheapest.price ? o : cheapest));
}
