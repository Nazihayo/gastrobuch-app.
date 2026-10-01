import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import ReviewsList from "./ReviewsList";
import type { Review } from "./actions";

export default async function ReviewsPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, comment, owner_response, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  const reviews: Review[] = (data ?? []).map((r) => ({
    id: r.id,
    customerName: r.customer_name,
    rating: r.rating,
    comment: r.comment,
    ownerResponse: r.owner_response,
    createdAt: r.created_at,
  }));

  return <ReviewsList initialReviews={reviews} />;
}
