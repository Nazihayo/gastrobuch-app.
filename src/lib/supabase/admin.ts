import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Bypasses Row Level Security entirely. Never import this into anything that
// runs in the browser or handles a single user's request unchecked — used
// only from the team-invite flow, which checks the caller is an owner
// itself before touching this client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
