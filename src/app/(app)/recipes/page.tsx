import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import RecipesList from "./RecipesList";

export default async function RecipesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const [{ data: recipes }, { data: inventoryItems }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "id, name, price, delivery_commission_pct, photo_path, category, recipe_ingredients(id, name, cost, inventory_item_id, quantity_per_portion)"
      )
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("inventory_items")
      .select("id, name, unit")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: true }),
  ]);

  const initialRecipes = (recipes ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    deliveryCommissionPct: r.delivery_commission_pct,
    photoPath: r.photo_path,
    photoUrl: r.photo_path
      ? supabase.storage.from("menu-photos").getPublicUrl(r.photo_path).data.publicUrl
      : null,
    category: r.category,
    ingredients: r.recipe_ingredients.map((ing) => ({
      id: ing.id,
      name: ing.name,
      cost: ing.cost,
      inventoryItemId: ing.inventory_item_id,
      quantityPerPortion: ing.quantity_per_portion,
    })),
  }));

  return (
    <RecipesList
      country={restaurant.country}
      initialRecipes={initialRecipes}
      inventoryItems={inventoryItems ?? []}
    />
  );
}
