import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { averageTipPerHour } from "@/lib/staffEarnings";
import MyEarningsView, { type RecentPayout, type TodayShift, type UnclaimedStaff } from "./MyEarningsView";

export default async function MyEarningsPage() {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: claimed } = await supabase
    .from("staff_members")
    .select("id, name, rate")
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!claimed) {
    const { data: unclaimed } = await supabase
      .from("staff_members")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .is("user_id", null)
      .order("name", { ascending: true });

    return <MyEarningsView claimed={null} unclaimed={(unclaimed ?? []) as UnclaimedStaff[]} />;
  }

  const [{ data: shiftRows }, { data: ownPayoutRows }] = await Promise.all([
    supabase
      .from("staff_shifts")
      .select("start_time, end_time")
      .eq("staff_member_id", claimed.id)
      .eq("date", today)
      .order("start_time", { ascending: true })
      .limit(1),
    supabase
      .from("tip_pool_payouts")
      .select("tip_pool_id, hours, amount")
      .eq("staff_member_id", claimed.id),
  ]);

  const poolIds = [...new Set((ownPayoutRows ?? []).map((p) => p.tip_pool_id))];
  const { data: poolRows } =
    poolIds.length > 0
      ? await supabase
          .from("tip_pools")
          .select("id, period_start, period_end, total_amount, split_method")
          .in("id", poolIds)
      : { data: [] };
  const poolById = new Map((poolRows ?? []).map((p) => [p.id, p]));

  // Prefer the staff member's own tip history for the per-hour average; a
  // brand-new hire with no payouts yet falls back to the whole restaurant's
  // history so the estimate isn't just a hard "0".
  let tipSource: { hours: number; amount: number }[] = ownPayoutRows ?? [];
  if (tipSource.length === 0) {
    const { data: restaurantPoolRows } = await supabase
      .from("tip_pools")
      .select("id")
      .eq("restaurant_id", restaurant.id);
    const restaurantPoolIds = (restaurantPoolRows ?? []).map((p) => p.id);
    if (restaurantPoolIds.length > 0) {
      const { data: allPayoutRows } = await supabase
        .from("tip_pool_payouts")
        .select("hours, amount")
        .in("tip_pool_id", restaurantPoolIds);
      tipSource = allPayoutRows ?? [];
    }
  }
  const tipPerHour = averageTipPerHour(tipSource);

  const sortedOwnPayouts = (ownPayoutRows ?? [])
    .map((p) => ({ ...p, pool: poolById.get(p.tip_pool_id) }))
    .filter((p) => p.pool)
    .sort((a, b) => (b.pool!.period_end < a.pool!.period_end ? -1 : 1));
  const mostRecent = sortedOwnPayouts[0];
  const recentPayout: RecentPayout | null = mostRecent
    ? {
        periodStart: mostRecent.pool!.period_start,
        periodEnd: mostRecent.pool!.period_end,
        poolTotal: mostRecent.pool!.total_amount,
        splitMethod: mostRecent.pool!.split_method as "hours" | "equal",
        hours: mostRecent.hours,
        amount: mostRecent.amount,
      }
    : null;

  const shift = shiftRows?.[0];
  const todayShift: TodayShift | null = shift
    ? { startTime: shift.start_time, endTime: shift.end_time }
    : null;

  return (
    <MyEarningsView
      claimed={{ name: claimed.name, rate: claimed.rate }}
      unclaimed={[]}
      todayShift={todayShift}
      tipPerHour={tipPerHour}
      recentPayout={recentPayout}
    />
  );
}
