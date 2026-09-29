"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { COUNTRIES, fmtMoney, type CountryCode } from "@/lib/countries";
import {
  addIngredient,
  addRecipe,
  removeIngredient,
  removeRecipe,
  updateIngredient,
  updateRecipe,
  type Ingredient,
} from "./actions";

type RecipeState = {
  id: string;
  name: string;
  price: number;
  deliveryCommissionPct: number;
  ingredients: Ingredient[];
};

export default function RecipesList({
  country,
  initialRecipes,
}: {
  country: CountryCode;
  initialRecipes: RecipeState[];
}) {
  const { t } = useLanguage();
  const [recipes, setRecipes] = useState<RecipeState[]>(initialRecipes);
  const [, startTransition] = useTransition();

  async function handleAddRecipe() {
    const created = await addRecipe();
    if (created) setRecipes((prev) => [...prev, { ...created, ingredients: [] }]);
  }

  function handleRemoveRecipe(r: RecipeState) {
    setRecipes((prev) => prev.filter((x) => x.id !== r.id));
    startTransition(() => {
      removeRecipe(r.id, r.name);
    });
  }

  function patchRecipeLocal(rid: string, patch: Partial<RecipeState>) {
    setRecipes((prev) => prev.map((r) => (r.id === rid ? { ...r, ...patch } : r)));
  }

  function commitRecipe(
    rid: string,
    patch: Partial<Pick<RecipeState, "name" | "price" | "deliveryCommissionPct">>
  ) {
    startTransition(() => {
      updateRecipe(rid, patch);
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

  function commitIngredient(iid: string, patch: Partial<Pick<Ingredient, "name" | "cost">>) {
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

      {recipes.length === 0 && (
        <p className="text-sm text-text-on-ink-dim">{t("rec_empty")}</p>
      )}

      {recipes.map((r) => {
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
                className="flex-1 bg-transparent text-base font-semibold outline-none"
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
                onClick={() => handleRemoveRecipe(r)}
                aria-label="remove"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {r.ingredients.map((ing) => (
                <div
                  key={ing.id}
                  className="grid grid-cols-[1fr_90px_44px] items-center gap-2 rounded-md border border-divider bg-ink px-2.5 py-2"
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

      <p className="text-center text-xs text-text-on-ink-dim">{t("rec_disclaimer")}</p>
    </div>
  );
}
