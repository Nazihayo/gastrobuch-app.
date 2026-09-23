import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";
import RecipesList from "./RecipesList";

export default async function RecipesPage() {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: recipes } = await supabase
    .from("recipes")
    .select(
      "id, name, price, delivery_commission_pct, recipe_ingredients(id, name, cost)"
    )
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: true });

  const initialRecipes = (recipes ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    deliveryCommissionPct: r.delivery_commission_pct,
    ingredients: r.recipe_ingredients,
  }));

  return <RecipesList country={restaurant.country} initialRecipes={initialRecipes} />;
}
