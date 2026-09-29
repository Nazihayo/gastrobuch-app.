import { calcSale } from "./calculations";
import { monthRange } from "./monthSummary";
import type { DatevConfig } from "./datev";
import type { CountryCode } from "./countries";
import type { createClient } from "./supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ReportDay = {
  date: string;
  food: number;
  drink: number;
  delivery: number;
  purchases: number;
  commissionAmount: number;
  vatDue: number;
  net: number;
};

export type ReportData = {
  totalSales: number;
  totalTax: number;
  wages: number;
  expenses: number;
  finalNet: number;
  days: ReportDay[];
  periodStart: string;
  periodEnd: string;
  datevConfig: DatevConfig;
};

// Shared by the owner-facing Monthly Report and the read-only Accountant
// dashboard — both show the exact same month, just inside different shells.
export async function getReportData(
  supabase: SupabaseServerClient,
  restaurantId: string,
  country: CountryCode
): Promise<ReportData> {
  const { start, end } = monthRange();

  const [{ data: monthSales }, { data: staff }, { data: expenseRows }, { data: datevRow }] =
    await Promise.all([
      supabase
        .from("sales_days")
        .select("date, food, drink, delivery, commission_pct, purchases")
        .eq("restaurant_id", restaurantId)
        .gte("date", start)
        .lt("date", end)
        .order("date", { ascending: true }),
      supabase.from("staff_members").select("hours, rate").eq("restaurant_id", restaurantId),
      supabase.from("expenses").select("amount").eq("restaurant_id", restaurantId),
      supabase
        .from("restaurants")
        .select(
          "datev_konto_food, datev_konto_drink, datev_konto_wages, datev_konto_expenses, datev_konto_bank, datev_berater_nr, datev_mandant_nr"
        )
        .eq("id", restaurantId)
        .single(),
    ]);

  const wages = (staff ?? []).reduce((sum, s) => sum + (s.hours || 0) * (s.rate || 0), 0);
  const expenses = (expenseRows ?? []).reduce((sum, e) => sum + (e.amount || 0), 0);

  let totalSales = 0;
  let totalTax = 0;
  let totalNet = 0;
  const days: ReportDay[] = [];
  for (const day of monthSales ?? []) {
    const r = calcSale(
      {
        food: day.food,
        drink: day.drink,
        delivery: day.delivery,
        commissionPct: day.commission_pct,
        purchases: day.purchases,
      },
      country
    );
    totalSales += r.total;
    totalTax += r.vatDue;
    totalNet += r.net;
    days.push({
      date: day.date,
      food: day.food,
      drink: day.drink,
      delivery: day.delivery,
      purchases: day.purchases,
      commissionAmount: r.commissionAmount,
      vatDue: r.vatDue,
      net: r.net,
    });
  }

  return {
    totalSales,
    totalTax,
    wages,
    expenses,
    finalNet: totalNet - wages - expenses,
    days,
    periodStart: start,
    periodEnd: end,
    datevConfig: {
      konto_food: datevRow?.datev_konto_food ?? "8300",
      konto_drink: datevRow?.datev_konto_drink ?? "8400",
      konto_wages: datevRow?.datev_konto_wages ?? "4120",
      konto_expenses: datevRow?.datev_konto_expenses ?? "4200",
      konto_bank: datevRow?.datev_konto_bank ?? "1000",
      berater_nr: datevRow?.datev_berater_nr ?? "",
      mandant_nr: datevRow?.datev_mandant_nr ?? "",
    },
  };
}
