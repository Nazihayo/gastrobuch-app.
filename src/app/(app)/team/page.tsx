import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurant } from "@/lib/restaurant";
import TeamView, { type Member } from "./TeamView";

export default async function TeamPage() {
  const { restaurant, role } = await getCurrentRestaurant();
  if (role !== "owner") redirect("/");

  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, user_id, role")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  const admin = createAdminClient();
  const members: Member[] = await Promise.all(
    (memberships ?? []).map(async (m) => {
      const { data } = await admin.auth.admin.getUserById(m.user_id);
      return { id: m.id, role: m.role, email: data?.user?.email ?? m.user_id };
    })
  );

  return <TeamView members={members} />;
}
