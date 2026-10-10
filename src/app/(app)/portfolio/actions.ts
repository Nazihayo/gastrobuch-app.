"use server";

import Anthropic from "@anthropic-ai/sdk";
import { getCurrentRestaurant } from "@/lib/restaurant";
import type { BrandStat } from "./PortfolioView";

const MODEL = "claude-opus-5-5";

export type PortfolioRecommendation = { text?: string; error?: "not_configured" | "generic" };

// Ranks a multi-brand owner's own restaurants against each other and
// recommends which to expand, fix, or retire — something no competitor
// checked in this round's research offers across a brand portfolio (every
// AI menu-engineering tool found operates within a single restaurant's own
// menu only).
export async function getPortfolioRecommendation(stats: BrandStat[]): Promise<PortfolioRecommendation> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "not_configured" };
  if (stats.length < 2) return { error: "generic" };

  // Belt-and-suspenders: only ever reason about restaurants this user is
  // actually a member of, even though the caller (PortfolioPage) already
  // scoped `stats` that way.
  const { allRestaurants } = await getCurrentRestaurant();
  const ownedIds = new Set(allRestaurants.map((r) => r.id));
  if (!stats.every((s) => ownedIds.has(s.restaurantId))) return { error: "generic" };

  const client = new Anthropic();
  const table = stats
    .map(
      (s) =>
        `- ${s.name}: ${s.orderCount30d} orders in the last 30 days, ${s.revenue30d.toFixed(2)} revenue, ${s.avgOrderValue.toFixed(2)} average order value, ${s.repeatRatePct}% repeat-customer rate`
    )
    .join("\n");

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system:
        "You are a restaurant-portfolio analyst inside the GastroHub app. Given 30-day performance stats for several brands/locations owned by the same person, write a short, concrete recommendation (3-5 sentences): which brand to invest in or replicate, which underperforming brand needs attention or might be worth retiring, and one concrete next step. Be direct and specific, citing the actual numbers. Reply in the same language as the brand names if they give a strong hint, otherwise reply in English.",
      messages: [{ role: "user", content: `Here is this owner's brand portfolio from the last 30 days:\n${table}` }],
    });

    const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    return { text: text?.text ?? "" };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return { error: "not_configured" };
    return { error: "generic" };
  }
}
