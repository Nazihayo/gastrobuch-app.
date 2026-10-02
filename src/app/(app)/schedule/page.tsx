import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeForecast } from "@/lib/forecast";
import { detectMinijobCapRisk } from "@/lib/scheduleCompliance";
import { COUNTRIES } from "@/lib/countries";
import ScheduleView from "./ScheduleView";
import type { Shift } from "./actions";

function weekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() + mondayOffset);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return {
    start: monday.toISOString().slice(0, 10),
    end: nextMonday.toISOString().slice(0, 10),
  };
}

export default async function SchedulePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const { start, end } = weekRange();

  const monthStart = `${start.slice(0, 7)}-01`;
  const monthEndDate = new Date(`${monthStart}T00:00:00Z`);
  monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
  const monthEnd = monthEndDate.toISOString().slice(0, 10);

  const [
    { data: staff },
    { data: shiftRows },
    { data: salesDays },
    { data: recipes },
    { data: monthShiftRows },
  ] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, name, rate")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("staff_shifts")
      .select("id, staff_member_id, date, start_time, end_time, staff_members(name)")
      .eq("restaurant_id", restaurant.id)
      .gte("date", start)
      .lt("date", end)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true }),
    supabase
      .from("sales_days")
      .select("date, food, drink, delivery, portions")
      .eq("restaurant_id", restaurant.id)
      .order("date", { ascending: false })
      .limit(180),
    supabase.from("recipes").select("id, name").eq("restaurant_id", restaurant.id),
    supabase
      .from("staff_shifts")
      .select("staff_member_id, date, start_time, end_time, staff_members(name)")
      .eq("restaurant_id", restaurant.id)
      .gte("date", monthStart)
      .lt("date", monthEnd),
  ]);

  const shifts: Shift[] = (shiftRows ?? []).map((s) => ({
    id: s.id,
    staffMemberId: s.staff_member_id,
    staffName: (s.staff_members as unknown as { name: string } | null)?.name ?? "",
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
  }));

  const dayBeforeWeek = new Date(`${start}T00:00:00Z`);
  dayBeforeWeek.setUTCDate(dayBeforeWeek.getUTCDate() - 1);
  const forecast = computeForecast(
    (salesDays ?? []).map((d) => ({
      date: d.date,
      food: d.food,
      drink: d.drink,
      delivery: d.delivery,
      portions: (d.portions as Record<string, number>) ?? {},
    })),
    recipes ?? [],
    dayBeforeWeek,
    7
  );

  const rateByStaff = new Map((staff ?? []).map((s) => [s.id, s.rate as number]));
  const monthShifts = (monthShiftRows ?? []).map((s) => ({
    staffMemberId: s.staff_member_id,
    staffName: (s.staff_members as unknown as { name: string } | null)?.name ?? "",
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
  }));
  const minijobCap = COUNTRIES[restaurant.country].minijob;
  const minijobFindings =
    minijobCap !== null ? detectMinijobCapRisk(monthShifts, rateByStaff, minijobCap) : [];

  return (
    <ScheduleView
      weekStart={start}
      staff={(staff ?? []).map((s) => ({ id: s.id, name: s.name }))}
      shifts={shifts}
      forecast={forecast}
      minijobFindings={minijobFindings}
      country={restaurant.country}
    />
  );
}
