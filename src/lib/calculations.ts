import { COUNTRIES, type CountryCode } from "./countries";

export type SaleInput = {
  food: number;
  drink: number;
  delivery: number;
  commissionPct: number;
  purchases: number;
};

export type SaleResult = {
  total: number;
  vatSalesTotal: number;
  vatPurch: number;
  vatDue: number;
  net: number;
  commissionAmount: number;
  delivery: number;
};

// Ported 1:1 from the original Gastrobuch prototype's calcSale(). Same
// numbers, same rounding behavior — do not "simplify" this without
// checking against the reference at reference/daftar-app.html.
export function calcSale(data: Partial<SaleInput>, country: CountryCode): SaleResult {
  const food = data.food || 0;
  const drink = data.drink || 0;
  const delivery = data.delivery || 0;
  const commissionPct = data.commissionPct || 0;
  const purch = data.purchases || 0;

  const conf = COUNTRIES[country];

  let vatFood: number, vatDrink: number, vatDelivery: number, vatPurchRate: number;
  if (conf.vatMode === "split") {
    vatFood = (food * conf.vatFood!) / (100 + conf.vatFood!);
    vatDrink = (drink * conf.vatDrink!) / (100 + conf.vatDrink!);
    vatDelivery = (delivery * conf.vatFood!) / (100 + conf.vatFood!);
    vatPurchRate = conf.vatFood!;
  } else {
    vatFood = (food * conf.vatRate!) / (100 + conf.vatRate!);
    vatDrink = (drink * conf.vatRate!) / (100 + conf.vatRate!);
    vatDelivery = (delivery * conf.vatRate!) / (100 + conf.vatRate!);
    vatPurchRate = conf.vatRate!;
  }

  const vatSalesTotal = vatFood + vatDrink + vatDelivery;
  const vatPurch = (purch * vatPurchRate) / (100 + vatPurchRate);
  const vatDue = Math.max(vatSalesTotal - vatPurch, 0);
  const total = food + drink + delivery;
  const commissionAmount = delivery * (commissionPct / 100);
  const net = total - vatSalesTotal - (purch - vatPurch) - vatDue - commissionAmount;

  return { total, vatSalesTotal, vatPurch, vatDue, net, commissionAmount, delivery };
}
