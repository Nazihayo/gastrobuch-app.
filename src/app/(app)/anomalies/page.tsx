import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRestaurant } from "@/lib/restaurant";
import {
  detectCashRatioAnomalies,
  summarizeCancellations,
  type CancellationRecord,
  type DailyPaymentSplit,
} from "@/lib/anomalies";
import AnomaliesView from "./AnomaliesView";

const LOOKBACK_DAYS = 30;

export default async function AnomaliesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);
  const sinceIso = since.toISOString();
  const sinceDate = sinceIso.slice(0, 10);

  const [{ data: cancelLogs }, { data: receipts }] = await Promise.all([
    supabase
      .from("audit_log")
      .select("user_id, order_id, created_at")
      .eq("restaurant_id", restaurant.id)
      .eq("action", "order_cancelled")
      .gte("created_at", sinceIso)
      .not("order_id", "is", null),
    supabase
      .from("receipts")
      .select("payment_method, total_amount, issued_at")
      .eq("restaurant_id", restaurant.id)
      .gte("issued_at", sinceIso),
  ]);

  const orderIds = [...new Set((cancelLogs ?? []).map((l) => l.order_id as string))];
  const { data: orders } =
    orderIds.length > 0
      ? await supabase.from("orders").select("id, created_at, total_estimate").in("id", orderIds)
      : { data: [] };
  const ordersById = new Map((orders ?? []).map((o) => [o.id, o]));

  const admin = createAdminClient();
  const emailCache = new Map<string, string>();
  async function emailFor(userId: string): Promise<string> {
    let email = emailCache.get(userId);
    if (!email) {
      const { data } = await admin.auth.admin.getUserById(userId);
      email = data?.user?.email ?? userId;
      emailCache.set(userId, email);
    }
    return email;
  }

  const cancellationRecords: CancellationRecord[] = [];
  for (const log of cancelLogs ?? []) {
    const order = log.order_id ? ordersById.get(log.order_id) : undefined;
    if (!order) continue;
    cancellationRecords.push({
      userId: log.user_id,
      userLabel: await emailFor(log.user_id),
      orderId: order.id,
      orderCreatedAt: order.created_at,
      cancelledAt: log.created_at,
      totalEstimate: order.total_estimate,
    });
  }

  const byDate = new Map<string, DailyPaymentSplit>();
  for (const r of receipts ?? []) {
    const date = r.issued_at.slice(0, 10);
    const entry = byDate.get(date) ?? { date, cash: 0, card: 0 };
    if (r.payment_method === "cash") entry.cash += r.total_amount;
    else if (r.payment_method === "card") entry.card += r.total_amount;
    byDate.set(date, entry);
  }

  const cancellationSummary = summarizeCancellations(cancellationRecords);
  const cashAnomalies = detectCashRatioAnomalies(Array.from(byDate.values()));

  return (
    <AnomaliesView
      cancellationSummary={cancellationSummary}
      cashAnomalies={cashAnomalies}
      country={restaurant.country}
      lookbackDays={LOOKBACK_DAYS}
      sinceDate={sinceDate}
    />
  );
}
