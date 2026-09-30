import { getCurrentRestaurant } from "@/lib/restaurant";
import AssistantView from "./AssistantView";

export default async function AssistantPage() {
  const { restaurant } = await getCurrentRestaurant();

  return <AssistantView restaurantName={restaurant.name} />;
}
