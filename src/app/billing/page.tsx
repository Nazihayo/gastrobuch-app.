import { getCurrentRestaurant } from "@/lib/restaurant";
import BillingView from "./BillingView";

export default async function BillingPage() {
  const { restaurant, role } = await getCurrentRestaurant();

  const trialDaysLeft = Math.max(
    0,
    Math.ceil((new Date(restaurant.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <BillingView
      restaurantName={restaurant.name}
      subscriptionStatus={restaurant.subscriptionStatus}
      trialDaysLeft={trialDaysLeft}
      isOwner={role === "owner"}
    />
  );
}
