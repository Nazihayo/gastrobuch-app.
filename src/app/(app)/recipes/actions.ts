"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentRestaurant } from "@/lib/restaurant";

export type Ingredient = {
  id: string;
  name: string;
  cost: number;
  inventoryItemId: string | null;
  quantityPerPortion: number;
};
export type RecipeHeader = {
  id: string;
  name: string;
  price: number;
  deliveryCommissionPct: number;
  photoPath: string | null;
  category: "food" | "drink";
  dietTag: "vegan" | "vegetarian" | null;
};

export async function addRecipe(): Promise<RecipeHeader | null> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipes")
    .insert({ restaurant_id: restaurant.id, name: "", price: 0, delivery_commission_pct: 30 })
    .select("id, name, price, delivery_commission_pct, photo_path, category, diet_tag")
    .single();

  if (error || !data) return null;

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "recipe_added",
    detail: "",
  });

  revalidatePath("/recipes");
  return {
    id: data.id,
    name: data.name,
    price: data.price,
    deliveryCommissionPct: data.delivery_commission_pct,
    photoPath: data.photo_path,
    category: data.category,
    dietTag: data.diet_tag,
  };
}

export async function updateRecipe(
  id: string,
  patch: Partial<{
    name: string;
    price: number;
    deliveryCommissionPct: number;
    category: "food" | "drink";
    dietTag: "vegan" | "vegetarian" | null;
  }>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.price !== undefined) dbPatch.price = patch.price;
  if (patch.deliveryCommissionPct !== undefined)
    dbPatch.delivery_commission_pct = patch.deliveryCommissionPct;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.dietTag !== undefined) dbPatch.diet_tag = patch.dietTag;

  await supabase.from("recipes").update(dbPatch).eq("id", id).eq("restaurant_id", restaurant.id);
  revalidatePath("/recipes");
}

export async function removeRecipe(id: string, name: string): Promise<void> {
  const { restaurant, userId } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase.from("recipes").delete().eq("id", id).eq("restaurant_id", restaurant.id);

  await supabase.from("audit_log").insert({
    restaurant_id: restaurant.id,
    user_id: userId,
    action: "recipe_removed",
    detail: name,
  });

  revalidatePath("/recipes");
}

export async function addIngredient(recipeId: string): Promise<Ingredient | null> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("recipe_ingredients")
    .insert({ restaurant_id: restaurant.id, recipe_id: recipeId, name: "", cost: 0 })
    .select("id, name, cost, inventory_item_id, quantity_per_portion")
    .single();

  if (error || !data) return null;

  revalidatePath("/recipes");
  return {
    id: data.id,
    name: data.name,
    cost: data.cost,
    inventoryItemId: data.inventory_item_id,
    quantityPerPortion: data.quantity_per_portion,
  };
}

export async function updateIngredient(
  id: string,
  patch: Partial<{
    name: string;
    cost: number;
    inventoryItemId: string | null;
    quantityPerPortion: number;
  }>
): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const dbPatch: Record<string, unknown> = {};
  if (patch.name !== undefined) dbPatch.name = patch.name;
  if (patch.cost !== undefined) dbPatch.cost = patch.cost;
  if (patch.inventoryItemId !== undefined) dbPatch.inventory_item_id = patch.inventoryItemId;
  if (patch.quantityPerPortion !== undefined)
    dbPatch.quantity_per_portion = patch.quantityPerPortion;

  await supabase
    .from("recipe_ingredients")
    .update(dbPatch)
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
}

export async function removeIngredient(id: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type UploadPhotoState = { error?: string; path?: string };

export async function uploadRecipePhoto(
  recipeId: string,
  formData: FormData
): Promise<UploadPhotoState> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "no_file" };
  }
  if (!file.type.startsWith("image/")) {
    return { error: "not_image" };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return { error: "too_large" };
  }

  const { data: existing } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id)
    .single();
  if (existing?.photo_path) {
    await supabase.storage.from("menu-photos").remove([existing.photo_path]);
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${restaurant.id}/${recipeId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-photos")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    return { error: uploadError.message };
  }

  await supabase
    .from("recipes")
    .update({ photo_path: path })
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
  return { path };
}

export async function removeRecipePhoto(recipeId: string): Promise<void> {
  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (existing?.photo_path) {
    await supabase.storage.from("menu-photos").remove([existing.photo_path]);
  }

  await supabase
    .from("recipes")
    .update({ photo_path: null })
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
}

export type EnhancePhotoState = { path?: string; error?: "not_configured" | "no_photo" | "generic" };

const ENHANCE_PROMPT =
  "Professional restaurant food photography of this exact dish: clean plating, appetizing natural lighting, shallow depth of field, neutral background. Keep the dish itself recognizable — do not change the food.";

// Edits the restaurant's own uploaded photo (not a generic stock image) via
// OpenAI's image-edit API — requires the restaurant owner's own
// OPENAI_API_KEY, billed on their OpenAI account, same opt-in pattern as
// the Claude-powered assistant.
export async function enhancePhoto(recipeId: string): Promise<EnhancePhotoState> {
  if (!process.env.OPENAI_API_KEY) {
    return { error: "not_configured" };
  }

  const { restaurant } = await getCurrentRestaurant();
  const supabase = await createClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id)
    .single();

  if (!recipe?.photo_path) {
    return { error: "no_photo" };
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("menu-photos")
    .download(recipe.photo_path);
  if (downloadError || !fileBlob) {
    return { error: "generic" };
  }

  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("image", fileBlob, "photo.jpg");
  formData.append("prompt", ENHANCE_PROMPT);
  formData.append("size", "1024x1024");

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: formData,
    });
  } catch {
    return { error: "generic" };
  }

  if (response.status === 401) {
    return { error: "not_configured" };
  }
  if (!response.ok) {
    return { error: "generic" };
  }

  const json = await response.json();
  const b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) {
    return { error: "generic" };
  }

  const bytes = Buffer.from(b64, "base64");
  const path = `${restaurant.id}/${recipeId}-enhanced-${Date.now()}.png`;

  const { error: uploadError } = await supabase.storage
    .from("menu-photos")
    .upload(path, bytes, { contentType: "image/png" });
  if (uploadError) {
    return { error: "generic" };
  }

  await supabase.storage.from("menu-photos").remove([recipe.photo_path]);
  await supabase
    .from("recipes")
    .update({ photo_path: path })
    .eq("id", recipeId)
    .eq("restaurant_id", restaurant.id);

  revalidatePath("/recipes");
  return { path };
}
