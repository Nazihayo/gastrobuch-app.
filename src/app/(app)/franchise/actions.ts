"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type CreateBranchState = {
  success?: boolean;
  error?: "not_owner" | "missing_name" | "invite_failed" | "generic";
};

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

// Creates a new branch under the current restaurant and, optionally,
// invites someone else straight to owner-level access on it — self-serve,
// no vendor contact. The host stays an owner on the new branch too (not
// just the invitee), so it automatically shows up in the host's own
// portfolio/group-finance views without any new RLS policy: ordinary
// membership already covers it.
export async function createFranchiseBranch(
  name: string,
  country: string,
  language: string,
  inviteEmail: string
): Promise<CreateBranchState> {
  const { restaurant, role, userId } = await getCurrentRestaurant();
  if (role !== "owner") return { error: "not_owner" };
  if (!name.trim()) return { error: "missing_name" };

  const admin = createAdminClient();

  const { data: newRestaurant, error: createError } = await admin
    .from("restaurants")
    .insert({ name: name.trim(), country, language, parent_restaurant_id: restaurant.id })
    .select("id")
    .single();
  if (createError || !newRestaurant) return { error: "generic" };

  await admin.from("memberships").insert({ restaurant_id: newRestaurant.id, user_id: userId, role: "owner" });

  if (inviteEmail.trim()) {
    let inviteeId = await findUserIdByEmail(admin, inviteEmail);
    if (!inviteeId) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(inviteEmail.trim());
      if (error || !data?.user) return { error: "invite_failed" };
      inviteeId = data.user.id;
    }
    await admin.from("memberships").insert({ restaurant_id: newRestaurant.id, user_id: inviteeId, role: "owner" });
  }

  revalidatePath("/franchise");
  return { success: true };
}
