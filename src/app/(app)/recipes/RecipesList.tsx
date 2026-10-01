"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import { useUndoableRemove } from "@/lib/useUndoableRemove";
import UndoToast from "@/components/UndoToast";
import { createClient } from "@/lib/supabase/client";
import {
  addIngredient,
  addRecipe,
  removeIngredient,
  removeRecipe,
  removeRecipePhoto,
  updateIngredient,
  updateRecipe,
  uploadRecipePhoto,
  type Ingredient,
} from "./actions";

type RecipeState = {
  id: string;
  name: string;
  price: number;
  deliveryCommissionPct: number;
  photoPath: string | null;
  photoUrl: string | null;
  category: "food" | "drink";
  dietTag: "vegan" | "vegetarian" | null;
  ingredients: Ingredient[];
};

export default function RecipesList({
  country,
  initialRecipes,
  inventoryItems,
}: {
  country: CountryCode;
  initialRecipes: RecipeState[];
  inventoryItems: { id: string; name: string; unit: string }[];
}) {
  const { t } = useLanguage();
  const [recipes, setRecipes] = useState<RecipeState[]>(initialRecipes);
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  async function handleAddRecipe() {
    const created = await addRecipe();
    if (created) setRecipes((prev) => [...prev, { ...created, photoUrl: null, ingredients: [] }]);
  }

  const commitRemoveRecipe = useCallback(
    (r: RecipeState) => {
      setRecipes((prev) => prev.filter((x) => x.id !== r.id));
      startTransition(() => {
        removeRecipe(r.id, r.name);
      });
    },
    [startTransition]
  );
  const { pending, scheduleRemove, undo } = useUndoableRemove(commitRemoveRecipe);
  const visibleRecipes = useMemo(
    () => recipes.filter((r) => r.id !== pending?.id),
    [recipes, pending]
  );
  const searchedRecipes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return visibleRecipes;
    return visibleRecipes.filter((r) => r.name.toLowerCase().includes(q));
  }, [visibleRecipes, query]);

  function patchRecipeLocal(rid: string, patch: Partial<RecipeState>) {
    setRecipes((prev) => prev.map((r) => (r.id === rid ? { ...r, ...patch } : r)));
  }

  function commitRecipe(
    rid: string,
    patch: Partial<
      Pick<RecipeState, "name" | "price" | "deliveryCommissionPct" | "category" | "dietTag">
    >
  ) {
    startTransition(() => {
      updateRecipe(rid, patch);
    });
  }

  const [photoError, setPhotoError] = useState<string | null>(null);

  async function handlePhotoChange(rid: string, file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    const formData = new FormData();
    formData.set("photo", file);
    const result = await uploadRecipePhoto(rid, formData);
    if (result.error) {
      setPhotoError(
        result.error === "too_large"
          ? t("rec_photo_too_large")
          : result.error === "not_image"
            ? t("rec_photo_not_image")
            : t("rec_photo_error")
      );
      return;
    }
    if (result.path) {
      const supabase = createClient();
      const photoUrl = supabase.storage.from("menu-photos").getPublicUrl(result.path).data
        .publicUrl;
      patchRecipeLocal(rid, { photoPath: result.path, photoUrl });
    }
  }

  function handleRemovePhoto(rid: string) {
    patchRecipeLocal(rid, { photoPath: null, photoUrl: null });
    startTransition(() => {
      removeRecipePhoto(rid);
    });
  }

  async function handleAddIngredient(rid: string) {
    const created = await addIngredient(rid);
    if (created) {
      setRecipes((prev) =>
        prev.map((r) =>
          r.id === rid ? { ...r, ingredients: [...r.ingredients, created] } : r
        )
      );
    }
  }

  function handleRemoveIngredient(rid: string, iid: string) {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === rid ? { ...r, ingredients: r.ingredients.filter((i) => i.id !== iid) } : r
      )
    );
    startTransition(() => {
      removeIngredient(iid);
    });
  }

  function patchIngredientLocal(rid: string, iid: string, patch: Partial<Ingredient>) {
    setRecipes((prev) =>
      prev.map((r) =>
        r.id === rid
          ? {
              ...r,
              ingredients: r.ingredients.map((i) => (i.id === iid ? { ...i, ...patch } : i)),
            }
          : r
      )
    );
  }

  function commitIngredient(
    iid: string,
    patch: Partial<Pick<Ingredient, "name" | "cost" | "inventoryItemId" | "quantityPerPortion">>
  ) {
    startTransition(() => {
      updateIngredient(iid, patch);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("rec_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("rec_lead")}</p>
      </div>

      {visibleRecipes.length > 5 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("rec_search_ph")}
          className="min-h-11 rounded-lg border border-divider bg-ink-soft px-3 py-2 text-sm outline-none focus:border-brand-green-bright"
        />
      )}

      {searchedRecipes.length === 0 && (
        <p className="text-sm text-text-on-ink-dim">
          {visibleRecipes.length === 0 ? t("rec_empty") : t("cust_no_match")}
        </p>
      )}

      {searchedRecipes.map((r) => {
        const costTotal = r.ingredients.reduce((sum, i) => sum + (i.cost || 0), 0);
        const price = r.price || 0;
        const marginEur = price - costTotal;
        const marginPct = price > 0 ? (marginEur / price) * 100 : 0;
        const marginGood = marginPct >= 60;

        const commission = r.deliveryCommissionPct ?? 30;
        const deliveryNet = price * (1 - commission / 100);
        const deliveryMarginEur = deliveryNet - costTotal;
        const deliveryMarginPct = price > 0 ? (deliveryMarginEur / price) * 100 : 0;
        const deliveryGood = deliveryMarginEur > 0 && deliveryMarginPct >= 40;

        return (
          <div key={r.id} className="rounded-xl border border-divider bg-ink-soft p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                type="text"
                defaultValue={r.name}
                placeholder={t("rec_name_ph")}
                onChange={(e) => patchRecipeLocal(r.id, { name: e.target.value })}
                onBlur={(e) => commitRecipe(r.id, { name: e.target.value })}
                className="w-0 min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
              />
              <div className="flex min-h-11 items-center gap-1 rounded-md border border-divider bg-ink px-2 py-1">
                <span className="text-xs text-text-on-ink-dim">
                  {COUNTRIES[country].currency}
                </span>
                <input
                  type="number"
                  step={0.1}
                  defaultValue={r.price}
                  onChange={(e) =>
                    patchRecipeLocal(r.id, { price: parseFloat(e.target.value) || 0 })
                  }
                  onBlur={(e) =>
                    commitRecipe(r.id, { price: parseFloat(e.target.value) || 0 })
                  }
                  className="w-16 bg-transparent text-right font-num text-sm outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => scheduleRemove(r)}
                aria-label="remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            </div>

            <div className="mb-3 flex items-center gap-3">
              {r.photoUrl ? (
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a public Supabase Storage URL, not something Next's optimizer can process */}
                  <img
                    src={r.photoUrl}
                    alt={r.name || ""}
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(r.id)}
                    aria-label="remove photo"
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs text-text-on-ink-dim hover:text-brand-red"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-divider text-[10px] text-text-on-ink-dim hover:text-text-on-ink">
                  📷 {t("rec_photo_add")}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(r.id, e.target.files?.[0])}
                  />
                </label>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-xs text-text-on-ink-dim">{t("rec_photo_hint")}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      patchRecipeLocal(r.id, { category: "food" });
                      commitRecipe(r.id, { category: "food" });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      r.category === "food"
                        ? "border-brand-green-bright text-brand-green-bright"
                        : "border-divider text-text-on-ink-dim"
                    }`}
                  >
                    🍔 {t("rec_category_food")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      patchRecipeLocal(r.id, { category: "drink" });
                      commitRecipe(r.id, { category: "drink" });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      r.category === "drink"
                        ? "border-brand-green-bright text-brand-green-bright"
                        : "border-divider text-text-on-ink-dim"
                    }`}
                  >
                    🥤 {t("rec_category_drink")}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      patchRecipeLocal(r.id, { dietTag: null });
                      commitRecipe(r.id, { dietTag: null });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      r.dietTag === null
                        ? "border-brand-green-bright text-brand-green-bright"
                        : "border-divider text-text-on-ink-dim"
                    }`}
                  >
                    {t("rec_diet_none")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      patchRecipeLocal(r.id, { dietTag: "vegetarian" });
                      commitRecipe(r.id, { dietTag: "vegetarian" });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      r.dietTag === "vegetarian"
                        ? "border-brand-green-bright text-brand-green-bright"
                        : "border-divider text-text-on-ink-dim"
                    }`}
                  >
                    🥦 {t("rec_diet_vegetarian")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      patchRecipeLocal(r.id, { dietTag: "vegan" });
                      commitRecipe(r.id, { dietTag: "vegan" });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                      r.dietTag === "vegan"
                        ? "border-brand-green-bright text-brand-green-bright"
                        : "border-divider text-text-on-ink-dim"
                    }`}
                  >
                    🌱 {t("rec_diet_vegan")}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {r.ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="grid grid-cols-[minmax(0,1fr)_90px_44px] items-center gap-2 rounded-md border border-divider bg-ink px-2.5 py-2"
                >
                  <input
                    type="text"
                    defaultValue={ing.name}
                    placeholder={t("rec_ing_name_ph")}
                    onChange={(e) =>
                      patchIngredientLocal(r.id, ing.id, { name: e.target.value })
                    }
                    onBlur={(e) => commitIngredient(ing.id, { name: e.target.value })}
                    className="bg-transparent text-xs outline-none"
                  />
                  <div className="flex items-center gap-1 rounded border border-divider px-1.5">
                    <span className="text-[10px] text-text-on-ink-dim">
                      {COUNTRIES[country].currency}
                    </span>
                    <input
                      type="number"
                      step={0.01}
                      defaultValue={ing.cost}
                      onChange={(e) =>
                        patchIngredientLocal(r.id, ing.id, {
                          cost: parseFloat(e.target.value) || 0,
                        })
                      }
                      onBlur={(e) =>
                        commitIngredient(ing.id, { cost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-transparent py-1.5 text-right font-num text-xs outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(r.id, ing.id)}
                    aria-label="remove ingredient"
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
                  >
                    ✕
                  </button>
                  {inventoryItems.length > 0 && (
                    <div className="col-span-3 flex min-w-0 items-center gap-2 pt-1">
                      <select
                        value={ing.inventoryItemId ?? ""}
                        onChange={(e) => {
                          const inventoryItemId = e.target.value || null;
                          patchIngredientLocal(r.id, ing.id, { inventoryItemId });
                          commitIngredient(ing.id, { inventoryItemId });
                        }}
                        className="min-h-11 w-0 min-w-0 flex-1 rounded border border-divider bg-transparent text-[10px] text-text-on-ink-dim outline-none"
                      >
                        <option value="">{t("rec_stock_link_none")}</option>
                        {inventoryItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name || "—"}
                          </option>
                        ))}
                      </select>
                      {ing.inventoryItemId && (
                        <div className="flex min-h-11 items-center gap-1 rounded border border-divider px-1.5">
                          <input
                            type="number"
                            min={0}
                            step={0.001}
                            defaultValue={ing.quantityPerPortion}
                            onChange={(e) =>
                              patchIngredientLocal(r.id, ing.id, {
                                quantityPerPortion: parseFloat(e.target.value) || 0,
                              })
                            }
                            onBlur={(e) =>
                              commitIngredient(ing.id, {
                                quantityPerPortion: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-14 bg-transparent text-right font-num text-[10px] outline-none"
                          />
                          <span className="text-[9px] text-text-on-ink-dim">
                            {inventoryItems.find((i) => i.id === ing.inventoryItemId)?.unit}/
                            {t("rec_stock_per_portion")}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleAddIngredient(r.id)}
              className="mt-2 w-full rounded-md border border-dashed border-divider py-2.5 text-xs text-text-on-ink-dim hover:text-text-on-ink"
            >
              {t("rec_add_ing")}
            </button>

            <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-divider pt-3 text-xs text-text-on-ink-dim">
              <span>
                {t("rec_cost_total")}:{" "}
                <b className="font-num text-text-on-ink">{fmtMoney(costTotal, country)}</b>
              </span>
              <span>
                {t("rec_margin_eur").replace("{currency}", COUNTRIES[country].currency)}:{" "}
                <b className="font-num text-text-on-ink">{fmtMoney(marginEur, country)}</b>
              </span>
              <span>
                {t("rec_margin_pct")}:{" "}
                <b className={`font-num ${marginGood ? "text-brand-green-bright" : "text-brand-red"}`}>
                  {marginPct.toFixed(0)}%
                </b>
              </span>
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-text-on-ink-dim">
              <span className="flex items-center gap-1.5">
                {t("rec_delivery_commission")}:
                <span className="inline-flex items-center gap-1 rounded border border-divider px-1.5">
                  <input
                    type="number"
                    min={0}
                    max={90}
                    step={1}
                    defaultValue={commission}
                    onChange={(e) =>
                      patchRecipeLocal(r.id, {
                        deliveryCommissionPct: parseFloat(e.target.value) || 0,
                      })
                    }
                    onBlur={(e) =>
                      commitRecipe(r.id, {
                        deliveryCommissionPct: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-10 bg-transparent py-1 text-right font-num text-xs outline-none"
                  />
                  <span className="text-[10px]">%</span>
                </span>
              </span>
              <span>
                {t("rec_delivery_margin")}:{" "}
                <b className={`font-num ${deliveryGood ? "text-brand-green-bright" : "text-brand-red"}`}>
                  {fmtMoney(deliveryMarginEur, country)} ({deliveryMarginPct.toFixed(0)}%)
                </b>
              </span>
            </div>

            {deliveryMarginEur <= 0 && (
              <div className="mt-2 rounded-md bg-[rgba(192,85,74,0.12)] p-2.5 text-xs">
                {t("rec_delivery_warn")}
              </div>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={handleAddRecipe}
        className="min-h-11 rounded-lg border border-dashed border-divider py-3 text-sm text-text-on-ink-dim hover:text-text-on-ink"
      >
        {t("rec_add")}
      </button>

      {photoError && <p className="text-center text-sm text-brand-red">{photoError}</p>}

      <p className="text-center text-xs text-text-on-ink-dim">{t("rec_disclaimer")}</p>

      <UndoToast
        visible={pending !== null}
        label={t("undo_removed").replace("{name}", pending?.name || "")}
        onUndo={undo}
      />
    </div>
  );
}
