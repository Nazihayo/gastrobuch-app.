import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point an external uptime monitor (UptimeRobot, Better Stack, ...) at this
// URL. It does a real round trip to Supabase — not just "does the page
// load" — so a database outage or a broken RLS policy shows up as a failed
// check, not a false "ok".
//
// It also checks that every table the app code depends on actually exists
// in this Supabase project, not just that Postgres is reachable — a schema
// migration that was never run (a real incident: most of this app's tables
// were missing from the live database for weeks without this catching it)
// otherwise looks identical to a healthy "ok" from a bare connectivity
// check.
const CRITICAL_TABLES = [
  "restaurants",
  "memberships",
  "customers",
  "recipes",
  "orders",
  "order_items",
  "table_sessions",
  "receipts",
  "loyalty_tiers",
  "tip_pools",
  "tip_pool_payouts",
  "reviews",
  "cash_counts",
  "staff_shifts",
  "audit_log",
] as const;

export function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || /relation .* does not exist/i.test(error.message ?? "");
}

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();

    const tableChecks = await Promise.all(
      CRITICAL_TABLES.map(async (table) => {
        const { error } = await supabase.from(table).select("id", { count: "exact", head: true });
        return { table, ok: !isMissingTableError(error) };
      })
    );
    const missingTables = tableChecks.filter((c) => !c.ok).map((c) => c.table);

    if (missingTables.length > 0) {
      return NextResponse.json(
        { status: "error", database: "connected", schema: "incomplete", missing_tables: missingTables },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        schema: "complete",
        latency_ms: Date.now() - startedAt,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      { status: "error", database: "unreachable", error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
