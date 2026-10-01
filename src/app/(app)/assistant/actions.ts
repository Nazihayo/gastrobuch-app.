"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { computeForecast } from "@/lib/forecast";

export type ChatMessage = { role: "user" | "assistant"; text: string };
export type AskAssistantResult = { reply: string } | { error: "not_configured" | "generic" };

const MODEL = "claude-opus-5-5";
const MAX_TOOL_ITERATIONS = 5;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_today_summary",
    description:
      "Get a summary of today's business so far: number of direct orders placed today, their total revenue, and how many table tabs are currently open.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_open_tables",
    description:
      "List every currently open table tab (a dine-in bill not yet settled), with table number, how many orders are on it, and its running total.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "close_table_session",
    description:
      "Mark a table's open tab as paid and close it. Use this when the user says a specific table has just paid.",
    input_schema: {
      type: "object",
      properties: {
        table_number: { type: "string", description: "The table number to close, e.g. '5'." },
      },
      required: ["table_number"],
      additionalProperties: false,
    },
  },
  {
    name: "add_customer",
    description: "Add a new customer to the customer directory (for phone/delivery orders).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        phone: { type: "string" },
        address: { type: "string" },
        notes: { type: "string" },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "list_low_stock",
    description:
      "List inventory items whose remaining stock is below the amount needed — i.e. items that should be restocked soon.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "update_recipe_price",
    description: "Change the menu price of a dish, found by (partial, case-insensitive) name.",
    input_schema: {
      type: "object",
      properties: {
        dish_name: { type: "string", description: "The dish's name, or part of it." },
        new_price: { type: "number", description: "The new gross (VAT-inclusive) price." },
      },
      required: ["dish_name", "new_price"],
      additionalProperties: false,
    },
  },
  {
    name: "restock_inventory_item",
    description:
      "Set an inventory item's remaining stock level, found by (partial, case-insensitive) name. Use this when the user says they've just restocked or received a delivery of something.",
    input_schema: {
      type: "object",
      properties: {
        item_name: { type: "string", description: "The inventory item's name, or part of it." },
        new_remaining: { type: "number", description: "The new remaining quantity, in the item's existing unit." },
      },
      required: ["item_name", "new_remaining"],
      additionalProperties: false,
    },
  },
  {
    name: "add_fixed_cost",
    description:
      "Add a new recurring MONTHLY fixed cost (e.g. rent, electricity, insurance) — not a one-off purchase. Do not use this for a single variable/occasional expense.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "What the fixed cost is, e.g. 'Miete' (rent)." },
        amount: { type: "number", description: "The monthly amount." },
      },
      required: ["name", "amount"],
      additionalProperties: false,
    },
  },
  {
    name: "get_forecast",
    description:
      "Get the forecasted revenue and top-selling dishes for the next 7 days, estimated from this restaurant's own historical sales on the same weekday.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "add_staff_shift",
    description:
      "Schedule a work shift for a staff member, found by (partial, case-insensitive) name.",
    input_schema: {
      type: "object",
      properties: {
        staff_name: { type: "string", description: "The staff member's name, or part of it." },
        date: { type: "string", description: "The shift's date, as YYYY-MM-DD." },
        start_time: { type: "string", description: "Start time, as HH:MM (24h)." },
        end_time: { type: "string", description: "End time, as HH:MM (24h)." },
      },
      required: ["staff_name", "date", "start_time", "end_time"],
      additionalProperties: false,
    },
  },
];

async function runTool(
  name: string,
  input: Record<string, unknown>,
  restaurantId: string
): Promise<string> {
  const supabase = await createClient();

  switch (name) {
    case "get_today_summary": {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [{ data: orders }, { count: openTables }] = await Promise.all([
        supabase
          .from("orders")
          .select("total_estimate, status")
          .eq("restaurant_id", restaurantId)
          .gte("created_at", startOfDay.toISOString()),
        supabase
          .from("table_sessions")
          .select("id", { count: "exact", head: true })
          .eq("restaurant_id", restaurantId)
          .eq("status", "open"),
      ]);
      const activeOrders = (orders ?? []).filter((o) => o.status !== "cancelled");
      const revenue = activeOrders.reduce((sum, o) => sum + o.total_estimate, 0);
      return JSON.stringify({
        orders_today: activeOrders.length,
        revenue_today: revenue,
        open_tables: openTables ?? 0,
      });
    }

    case "list_open_tables": {
      const { data: sessions } = await supabase
        .from("table_sessions")
        .select("table_number, opened_at, orders(total_estimate, status)")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open")
        .order("opened_at", { ascending: true });
      const result = (sessions ?? []).map((s) => {
        const active = s.orders.filter((o) => o.status !== "cancelled");
        return {
          table_number: s.table_number,
          order_count: active.length,
          total: active.reduce((sum, o) => sum + o.total_estimate, 0),
        };
      });
      return JSON.stringify(result);
    }

    case "close_table_session": {
      const tableNumber = String(input.table_number ?? "");
      const { data: session } = await supabase
        .from("table_sessions")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("table_number", tableNumber)
        .eq("status", "open")
        .maybeSingle();
      if (!session) {
        return JSON.stringify({ error: `No open tab found for table ${tableNumber}.` });
      }
      const { error } = await supabase
        .from("table_sessions")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", session.id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, table_number: tableNumber });
    }

    case "add_customer": {
      const { error } = await supabase.from("customers").insert({
        restaurant_id: restaurantId,
        name: String(input.name ?? ""),
        phone: String(input.phone ?? ""),
        address: String(input.address ?? ""),
        notes: String(input.notes ?? ""),
      });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true });
    }

    case "list_low_stock": {
      const { data: items } = await supabase
        .from("inventory_items")
        .select("name, unit, needed, remaining")
        .eq("restaurant_id", restaurantId)
        .gt("needed", 0);
      const low = (items ?? [])
        .filter((i) => i.remaining < i.needed)
        .map((i) => ({ name: i.name, unit: i.unit, remaining: i.remaining, needed: i.needed }));
      return JSON.stringify(low);
    }

    case "update_recipe_price": {
      const dishName = String(input.dish_name ?? "");
      const newPrice = Number(input.new_price);
      const { data: matches } = await supabase
        .from("recipes")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .ilike("name", `%${dishName}%`);
      if (!matches || matches.length === 0) {
        return JSON.stringify({ error: `No dish found matching "${dishName}".` });
      }
      if (matches.length > 1) {
        return JSON.stringify({
          error: "Multiple dishes match — ask the user to be more specific.",
          matches: matches.map((m) => m.name),
        });
      }
      const { error } = await supabase
        .from("recipes")
        .update({ price: newPrice })
        .eq("id", matches[0].id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, dish: matches[0].name, new_price: newPrice });
    }

    case "restock_inventory_item": {
      const itemName = String(input.item_name ?? "");
      const newRemaining = Number(input.new_remaining);
      const { data: matches } = await supabase
        .from("inventory_items")
        .select("id, name, unit")
        .eq("restaurant_id", restaurantId)
        .ilike("name", `%${itemName}%`);
      if (!matches || matches.length === 0) {
        return JSON.stringify({ error: `No inventory item found matching "${itemName}".` });
      }
      if (matches.length > 1) {
        return JSON.stringify({
          error: "Multiple inventory items match — ask the user to be more specific.",
          matches: matches.map((m) => m.name),
        });
      }
      const { error } = await supabase
        .from("inventory_items")
        .update({ remaining: newRemaining })
        .eq("id", matches[0].id);
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({
        success: true,
        item: matches[0].name,
        new_remaining: newRemaining,
        unit: matches[0].unit,
      });
    }

    case "add_fixed_cost": {
      const { error } = await supabase.from("expenses").insert({
        restaurant_id: restaurantId,
        name: String(input.name ?? ""),
        amount: Number(input.amount),
      });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true });
    }

    case "get_forecast": {
      const [{ data: salesDays }, { data: recipes }] = await Promise.all([
        supabase
          .from("sales_days")
          .select("date, food, drink, delivery, portions")
          .eq("restaurant_id", restaurantId)
          .order("date", { ascending: false })
          .limit(180),
        supabase.from("recipes").select("id, name").eq("restaurant_id", restaurantId),
      ]);
      const forecast = computeForecast(
        (salesDays ?? []).map((d) => ({
          date: d.date,
          food: d.food,
          drink: d.drink,
          delivery: d.delivery,
          portions: (d.portions as Record<string, number>) ?? {},
        })),
        recipes ?? [],
        new Date()
      );
      return JSON.stringify(forecast);
    }

    case "add_staff_shift": {
      const staffName = String(input.staff_name ?? "");
      const { data: matches } = await supabase
        .from("staff_members")
        .select("id, name")
        .eq("restaurant_id", restaurantId)
        .ilike("name", `%${staffName}%`);
      if (!matches || matches.length === 0) {
        return JSON.stringify({ error: `No staff member found matching "${staffName}".` });
      }
      if (matches.length > 1) {
        return JSON.stringify({
          error: "Multiple staff members match — ask the user to be more specific.",
          matches: matches.map((m) => m.name),
        });
      }
      const { error } = await supabase.from("staff_shifts").insert({
        restaurant_id: restaurantId,
        staff_member_id: matches[0].id,
        date: String(input.date ?? ""),
        start_time: String(input.start_time ?? ""),
        end_time: String(input.end_time ?? ""),
      });
      if (error) return JSON.stringify({ error: error.message });
      return JSON.stringify({ success: true, staff: matches[0].name });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export async function askAssistant(
  history: ChatMessage[],
  question: string
): Promise<AskAssistantResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "not_configured" };
  }

  const { restaurant, role } = await getCurrentRestaurant();
  const client = new Anthropic();

  const system = `You are the GastroHub assistant for "${restaurant.name}", a restaurant using the GastroHub app. Today's date is ${new Date().toISOString().slice(0, 10)}. The person you're talking to has the role "${role}" in this restaurant.

Reply in whatever language the user writes in (German, Arabic, or English) — match their language automatically.

You can answer questions about how to use the app, and you have tools to check live data and perform a few specific actions for this restaurant only. If someone asks for something no tool covers, say so plainly and suggest they use the relevant page in the app instead of guessing. Keep replies short and concrete — this is a busy restaurant owner or staff member, not a chat for its own sake.`;

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.text })),
    { role: "user", content: question },
  ];

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system,
        tools: TOOLS,
        messages,
      });

      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        const text = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
        return { reply: text?.text ?? "" };
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const result = await runTool(
          block.name,
          block.input as Record<string, unknown>,
          restaurant.id
        );
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return { reply: "" };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { error: "not_configured" };
    }
    return { error: "generic" };
  }
}
