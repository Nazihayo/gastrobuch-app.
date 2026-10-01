import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import TipsView from "./TipsView";
import type { TipPoolHistoryEntry } from "./actions";

export default async function TipsPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const sinceDate = ninetyDaysAgo.toISOString().slice(0, 10);

  const [{ data: staff }, { data: shifts }, { data: datevRow }, { data: pools }] =
    await Promise.all([
      supabase
        .from("staff_members")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .order("name"),
      supabase
        .from("staff_shifts")
        .select("staff_member_id, date, start_time, end_time")
        .eq("restaurant_id", restaurant.id)
        .gte("date", sinceDate),
      supabase
        .from("restaurants")
        .select("datev_konto_wages, datev_konto_bank, datev_berater_nr, datev_mandant_nr")
        .eq("id", restaurant.id)
        .single(),
      supabase
        .from("tip_pools")
        .select("id, period_start, period_end, total_amount, split_method, created_at")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false }),
    ]);

  const poolIds = (pools ?? []).map((p) => p.id);
  const { data: payoutRows } =
    poolIds.length > 0
      ? await supabase
          .from("tip_pool_payouts")
          .select("tip_pool_id, staff_member_id, staff_name, hours, amount")
          .in("tip_pool_id", poolIds)
      : { data: [] };

  const history: TipPoolHistoryEntry[] = (pools ?? []).map((p) => ({
    id: p.id,
    periodStart: p.period_start,
    periodEnd: p.period_end,
    totalAmount: p.total_amount,
    splitMethod: p.split_method,
    createdAt: p.created_at,
    payouts: (payoutRows ?? [])
      .filter((row) => row.tip_pool_id === p.id)
      .map((row) => ({
        staffMemberId: row.staff_member_id ?? "",
        staffName: row.staff_name,
        hours: row.hours,
        amount: row.amount,
      })),
  }));

  return (
    <TipsView
      staff={(staff ?? []).filter((s) => s.name.trim() !== "")}
      shifts={(shifts ?? []).map((s) => ({
        staffMemberId: s.staff_member_id,
        date: s.date,
        startTime: s.start_time,
        endTime: s.end_time,
      }))}
      country={restaurant.country}
      datevConfig={{
        konto_food: "",
        konto_drink: "",
        konto_wages: datevRow?.datev_konto_wages ?? "4120",
        konto_expenses: "",
        konto_bank: datevRow?.datev_konto_bank ?? "1000",
        berater_nr: datevRow?.datev_berater_nr ?? "",
        mandant_nr: datevRow?.datev_mandant_nr ?? "",
      }}
      history={history}
    />
  );
}
