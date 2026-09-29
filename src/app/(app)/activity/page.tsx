import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ActivityView, { type ActivityEntry } from "./ActivityView";

export default async function ActivityPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, user_id, action, detail, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const admin = createAdminClient();
  const emailCache = new Map<string, string>();
  const entries: ActivityEntry[] = [];
  for (const row of rows ?? []) {
    const userId: string = row.user_id;
    let email: string | undefined = emailCache.get(userId);
    if (!email) {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data?.user?.email ?? userId;
      emailCache.set(userId, email);
    }
    entries.push({
      id: String(row.id),
      email,
      action: String(row.action),
      detail: String(row.detail ?? ""),
      createdAt: String(row.created_at),
    });
  }

  return <ActivityView entries={entries} />;
}
