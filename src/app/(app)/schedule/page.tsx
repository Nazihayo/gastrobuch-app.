import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
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

  const [{ data: staff }, { data: shiftRows }] = await Promise.all([
    supabase
      .from("staff_members")
      .select("id, name")
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
  ]);

  const shifts: Shift[] = (shiftRows ?? []).map((s) => ({
    id: s.id,
    staffMemberId: s.staff_member_id,
    staffName: (s.staff_members as unknown as { name: string } | null)?.name ?? "",
    date: s.date,
    startTime: s.start_time,
    endTime: s.end_time,
  }));

  return (
    <ScheduleView
      weekStart={start}
      staff={(staff ?? []).map((s) => ({ id: s.id, name: s.name }))}
      shifts={shifts}
    />
  );
}
