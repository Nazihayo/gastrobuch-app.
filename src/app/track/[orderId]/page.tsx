import { notFound } from "next/navigation";
import { getOrderStatus } from "./actions";
import TrackOrderView from "./TrackOrderView";

export default async function TrackOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const order = await getOrderStatus(orderId);

  if (!order) {
    notFound();
  }

  return <TrackOrderView orderId={orderId} initialOrder={order} />;
}
