import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import HygieneView from "./HygieneView";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function HygienePage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();
  const today = todayKey();

  const [{ data: log }, { data: temps }] = await Promise.all([
    supabase
      .from("hygiene_logs")
      .select("checklist")
      .eq("restaurant_id", restaurant.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("hygiene_temp_readings")
      .select("id, name, type, value")
      .eq("restaurant_id", restaurant.id)
      .eq("date", today)
      .order("created_at", { ascending: true }),
  ]);

  const checklist = (log?.checklist as boolean[] | null) ?? [false, false, false, false, false];

  return (
    <HygieneView
      country={restaurant.country}
      today={today}
      initialChecklist={checklist}
      initialTemps={temps ?? []}
    />
  );
}
