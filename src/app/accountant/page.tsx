import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { getLocale } from "@/lib/i18n/server";
import { getReportData } from "@/lib/reportData";
import ReportView from "@/app/(app)/reports/ReportView";

export default async function AccountantPage() {
  const [{ restaurant }, locale] = await Promise.all([
    getCurrentRestaurant(),
    getLocale(),
  ]);
  const supabase = await createClient();
  const data = await getReportData(supabase, restaurant.id, restaurant.country);

  return <ReportView locale={locale} country={restaurant.country} {...data} />;
}
