import { COUNTRIES, type CountryCode } from "./countries";

export type VatCategory = "food" | "drink";

export type ReceiptLineInput = {
  name: string;
  quantity: number;
  unitPrice: number;
  vatCategory: VatCategory;
};

export type ReceiptLine = {
  name: string;
  quantity: number;
  unit_price: number;
  vat_category: VatCategory;
  line_total: number;
};

export type ReceiptComputation = {
  items: ReceiptLine[];
  vatBreakdown: Record<string, number>;
  total: number;
};

function vatRateFor(country: CountryCode, category: VatCategory): number {
  const conf = COUNTRIES[country];
  if (conf.vatMode === "split") {
    return category === "drink" ? conf.vatDrink! : conf.vatFood!;
  }
  return conf.vatRate!;
}

// Prices in this app are always gross (VAT-inclusive), matching how German
// menus are legally required to display them — so VAT here is extracted
// out of the line total, not added on top. Same formula as calcSale() in
// calculations.ts, applied per line instead of per daily aggregate.
export function computeReceipt(
  lines: ReceiptLineInput[],
  country: CountryCode
): ReceiptComputation {
  const items: ReceiptLine[] = [];
  const vatBreakdown: Record<string, number> = {};
  let total = 0;

  for (const line of lines) {
    const lineTotal = line.unitPrice * line.quantity;
    total += lineTotal;

    const rate = vatRateFor(country, line.vatCategory);
    const vatAmount = (lineTotal * rate) / (100 + rate);
    const key = String(rate);
    vatBreakdown[key] = (vatBreakdown[key] ?? 0) + vatAmount;

    items.push({
      name: line.name,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      vat_category: line.vatCategory,
      line_total: lineTotal,
    });
  }

  for (const key of Object.keys(vatBreakdown)) {
    vatBreakdown[key] = Math.round(vatBreakdown[key] * 100) / 100;
  }

  return { items, vatBreakdown, total: Math.round(total * 100) / 100 };
}
