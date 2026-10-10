"use client";

import { useLanguage } from "@/lib/i18n/context";
import type { VarianceFinding } from "@/lib/inventoryVariance";

export default function InventoryVarianceView({ findings }: { findings: VarianceFinding[] }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("inv_variance_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{t("inv_variance_lead")}</p>
      </div>

      {findings.length === 0 ? (
        <p className="rounded-xl border border-divider bg-ink-soft p-5 text-sm text-text-on-ink-dim">
          {t("inv_variance_empty")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {findings.map((f) => (
            <div key={f.inventoryItemId} className="rounded-xl border border-brand-red/40 bg-brand-red/10 p-4">
              <h2 className="text-sm font-semibold">⚠️ {f.itemName}</h2>
              <p className="mt-1 text-xs text-text-on-ink-dim">
                {t("inv_variance_stats")
                  .replace("{actual}", `${f.actualUsed} ${f.unit}`)
                  .replace("{theoretical}", `${f.theoreticalUsed} ${f.unit}`)}
              </p>
              {f.topDish && (
                <p className="mt-2 text-sm">
                  💡 {t("inv_variance_suggestion").replace("{dish}", f.topDish)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-on-ink-dim">{t("inv_variance_disclaimer")}</p>
    </div>
  );
}
