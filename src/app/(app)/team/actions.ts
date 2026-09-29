"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type InviteError =
  | "not_owner"
  | "invalid_email"
  | "invite_failed"
  | "already_member"
  | "insert_failed";
export type InviteResult = { error?: InviteError };

async function findUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data || data.users.length === 0) return null;
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

export async function inviteMember(
  email: string,
  role: "staff" | "accountant"
): Promise<InviteResult> {
  const { restaurant, role: myRole } = await getCurrentRestaurant();
  if (myRole !== "owner") return { error: "not_owner" };
  if (!email.trim()) return { error: "invalid_email" };

  const admin = createAdminClient();

  let userId = await findUserIdByEmail(admin, email);
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim());
    if (error || !data?.user) return { error: "invite_failed" };
    userId = data.user.id;
  }

  const { error: memberError } = await admin
    .from("memberships")
    .insert({ restaurant_id: restaurant.id, user_id: userId, role });

  if (memberError) {
    return { error: memberError.code === "23505" ? "already_member" : "insert_failed" };
  }

  revalidatePath("/team");
  return {};
}

export async function removeMember(membershipId: string, role: string): Promise<void> {
  const { restaurant, role: myRole } = await getCurrentRestaurant();
  if (myRole !== "owner" || role === "owner") return;

  const supabase = await createClient();
  await supabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/team");
}
