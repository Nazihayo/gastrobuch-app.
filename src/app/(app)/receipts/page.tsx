import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ReceiptsList, { type ReceiptSummary } from "./ReceiptsList";

export default async function ReceiptsPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, receipt_number, total_amount, payment_method, issued_at")
    .eq("restaurant_id", restaurant.id)
    .order("receipt_number", { ascending: false })
    .limit(200);

  const initialReceipts: ReceiptSummary[] = (receipts ?? []).map((r) => ({
    id: r.id,
    receiptNumber: r.receipt_number,
    totalAmount: r.total_amount,
    paymentMethod: r.payment_method,
    issuedAt: r.issued_at,
  }));

  return <ReceiptsList country={restaurant.country} initialReceipts={initialReceipts} />;
}
