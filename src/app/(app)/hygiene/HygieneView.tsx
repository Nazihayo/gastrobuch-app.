"use client";

import { useMemo, useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/context";
import { hygieneChecklistLabels } from "@/lib/i18n/dictionaries";
import { COUNTRIES, type CountryCode } from "@/lib/countries";
import {
  addTempReading,
  removeTempReading,
  saveChecklist,
  updateTempReading,
  type TempReading,
} from "./actions";

function isBad(temp: TempReading): boolean {
  if (temp.type === "cooling") return temp.value > 5;
  return temp.value > -18;
}

export default function HygieneView({
  country,
  today,
  initialChecklist,
  initialTemps,
}: {
  country: CountryCode;
  today: string;
  initialChecklist: boolean[];
  initialTemps: TempReading[];
}) {
  const { t, locale } = useLanguage();
  const [temps, setTemps] = useState<TempReading[]>(initialTemps);
  const [checklist, setChecklist] = useState<boolean[]>(initialChecklist);
  const [, startTransition] = useTransition();

  const labels = hygieneChecklistLabels[locale];
  const lead = t("hyg_lead").replace("{law}", COUNTRIES[country].hygieneLaw[locale]);

  const anyBad = useMemo(() => temps.some(isBad), [temps]);
  const anyUnchecked = checklist.some((c) => !c);
  const statusOk = !anyBad && !anyUnchecked;

  function patchTempLocal(id: string, patch: Partial<TempReading>) {
    setTemps((prev) => prev.map((tr) => (tr.id === id ? { ...tr, ...patch } : tr)));
  }

  function commitTemp(id: string, patch: Partial<Pick<TempReading, "name" | "type" | "value">>) {
    startTransition(() => {
      updateTempReading(id, patch);
    });
  }

  async function handleAddTemp() {
    const created = await addTempReading(today);
    if (created) setTemps((prev) => [...prev, created]);
  }

  function handleRemoveTemp(id: string) {
    setTemps((prev) => prev.filter((tr) => tr.id !== id));
    startTransition(() => {
      removeTempReading(id);
    });
  }

  function toggleCheck(index: number) {
    const next = checklist.map((c, i) => (i === index ? !c : c));
    setChecklist(next);
    startTransition(() => {
      saveChecklist(today, next);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold">{t("hyg_title")}</h1>
        <p className="mt-1 text-sm text-text-on-ink-dim">{lead}</p>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">
          {t("hyg_temps_title")}
        </h3>
        <div className="flex flex-col gap-3">
          {temps.map((temp) => {
            const bad = isBad(temp);
            return (
              <div
                key={temp.id}
                className={`rounded-lg border bg-ink p-3 ${
                  bad ? "border-brand-red" : "border-divider"
                }`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <input
                    type="text"
                    defaultValue={temp.name}
                    placeholder={t("hyg_name_ph")}
                    onChange={(e) => patchTempLocal(temp.id, { name: e.target.value })}
                    onBlur={(e) => commitTemp(temp.id, { name: e.target.value })}
                    className="w-0 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
                  />
                  <select
                    value={temp.type}
                    onChange={(e) => {
                      const type = e.target.value as TempReading["type"];
                      patchTempLocal(temp.id, { type });
                      commitTemp(temp.id, { type });
                    }}
                    className="min-h-11 rounded border border-divider bg-ink-soft px-2 py-1 text-xs text-text-on-ink-dim"
                  >
                    <option value="cooling">{t("hyg_cooling")}</option>
                    <option value="freezing">{t("hyg_freezing")}</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveTemp(temp.id)}
                    aria-label="remove"
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-text-on-ink-dim hover:text-brand-red"
                  >
                    ✕
                  </button>
                </div>
                <div className="min-h-11 rounded-md bg-ink-soft px-2 py-1.5 text-center">
                  <label className="block text-[9.5px] text-text-on-ink-dim">°C</label>
                  <input
                    type="number"
                    step={0.5}
                    defaultValue={temp.value}
                    onChange={(e) =>
                      patchTempLocal(temp.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    onBlur={(e) =>
                      commitTemp(temp.id, { value: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-transparent text-center font-num text-sm outline-none"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleAddTemp}
          className="mt-3 min-h-11 w-full rounded-lg border border-dashed border-divider py-2.5 text-sm text-text-on-ink-dim hover:text-text-on-ink"
        >
          {t("hyg_add_temp")}
        </button>
      </div>

      <div className="rounded-xl border border-divider bg-ink-soft p-5">
        <h3 className="mb-3 text-xs font-medium text-text-on-ink-dim">
          {t("hyg_checklist_title")}
        </h3>
        <div className="flex flex-col gap-2">
          {labels.map((label, i) => (
            <label
              key={i}
              className="flex items-center gap-3 rounded-lg border border-divider bg-ink p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={checklist[i] ?? false}
                onChange={() => toggleCheck(i)}
                className="h-[19px] w-[19px] accent-brand-green-bright"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div
        className={`rounded-lg p-3.5 text-center text-sm font-semibold ${
          statusOk
            ? "bg-[rgba(31,107,77,0.18)] text-brand-green-bright"
            : "bg-[rgba(192,85,74,0.18)] text-brand-red"
        }`}
      >
        {statusOk ? t("hyg_status_ok") : t("hyg_status_warn")}
      </div>

      <p className="text-center text-xs text-text-on-ink-dim">{t("hyg_disclaimer")}</p>
    </div>
  );
}
