"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  ownerResponse: string | null;
  createdAt: string;
};

export async function saveOwnerResponse(reviewId: string, response: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("reviews")
    .update({ owner_response: response })
    .eq("id", reviewId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/reviews");
}

export type DraftResponseResult = { draft: string } | { error: "not_configured" | "generic" };

const MODEL = "claude-opus-5-5";

export async function draftAiResponse(reviewId: string): Promise<DraftResponseResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "not_configured" };
  }

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: review } = await supabase
    .from("reviews")
    .select("rating, comment, customer_name")
    .eq("id", reviewId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!review) return { error: "generic" };

  const client = new Anthropic();
  const languageHint = { de: "German", ar: "Arabic", en: "English" }[restaurant.language] ?? "German";

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: `You draft short, warm, specific owner responses to customer reviews for "${restaurant.name}", a restaurant. Reply in ${languageHint} unless the review itself is clearly written in a different language, in which case match the review's language. Keep it to 2-4 sentences, thank the customer by name if given, address anything they praised or criticized specifically (don't be generic), and never admit legal liability. Output only the response text, nothing else.`,
      messages: [
        {
          role: "user",
          content: `Customer name: ${review.customer_name || "anonymous"}\nRating: ${review.rating}/5\nReview text: ${review.comment || "(no written comment)"}`,
        },
      ],
    });

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return { draft: text?.text ?? "" };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { error: "not_configured" };
    }
    return { error: "generic" };
  }
}
