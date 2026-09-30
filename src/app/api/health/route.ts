import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point an external uptime monitor (UptimeRobot, Better Stack, ...) at this
// URL. It does a real round trip to Supabase — not just "does the page
// load" — so a database outage or a broken RLS policy shows up as a failed
// check, not a false "ok".
export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("restaurants")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { status: "error", database: "unreachable", error: error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { status: "ok", database: "connected", latency_ms: Date.now() - startedAt },
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
