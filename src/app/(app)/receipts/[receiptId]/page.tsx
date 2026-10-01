import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ReceiptView, { type ReceiptItem } from "./ReceiptView";

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ receiptId: string }>;
}) {
  const { receiptId } = await params;
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: receipt }, { data: restaurantRow }] = await Promise.all([
    supabase
      .from("receipts")
      .select("receipt_number, items, vat_breakdown, total_amount, payment_method, issued_at")
      .eq("id", receiptId)
      .eq("restaurant_id", restaurant.id)
      .single(),
    supabase.from("restaurants").select("name, address").eq("id", restaurant.id).single(),
  ]);

  if (!receipt) notFound();

  return (
    <ReceiptView
      country={restaurant.country}
      restaurantName={restaurantRow?.name ?? restaurant.name}
      restaurantAddress={restaurantRow?.address ?? ""}
      receiptNumber={receipt.receipt_number}
      items={receipt.items as ReceiptItem[]}
      vatBreakdown={receipt.vat_breakdown as Record<string, number>}
      totalAmount={receipt.total_amount}
      paymentMethod={receipt.payment_method}
      issuedAt={receipt.issued_at}
    />
  );
}
