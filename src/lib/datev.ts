// Builds a best-effort DATEV "Buchungsstapel" (EXTF) export file, following
// the publicly documented structure of that format. This is NOT a certified
// DATEV integration — account numbers default to common SKR03 values and
// the file should be checked with a Steuerberater before the first real use
// (surfaced as a disclaimer wherever this is offered in the UI).

export type DatevConfig = {
  konto_food: string;
  konto_drink: string;
  konto_wages: string;
  konto_expenses: string;
  konto_bank: string;
  berater_nr: string;
  mandant_nr: string;
};

export type DatevDay = { date: string; food: number; drink: number };

function deNum(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function compact(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

// DATEV's Belegdatum field is day+month only within the booking period.
function ddmm(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}${m}`;
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function row(
  amount: number,
  soll: "S" | "H",
  konto: string,
  gegenkonto: string,
  belegdatum: string,
  text: string
): string {
  return [
    deNum(Math.abs(amount)),
    soll,
    "EUR",
    "",
    "",
    "",
    konto,
    gegenkonto,
    "",
    belegdatum,
    "",
    "",
    "",
    csvField(text),
  ].join(";");
}

export function buildDatevExport(
  days: DatevDay[],
  wages: number,
  expenses: number,
  config: DatevConfig,
  periodStart: string,
  periodEndExclusive: string
): string {
  // monthRange() gives an exclusive end (first day of next month); the
  // booking date for the aggregate wages/expenses lines should be the
  // actual last day of the period.
  const periodEnd = new Date(periodEndExclusive + "T00:00:00Z");
  periodEnd.setUTCDate(periodEnd.getUTCDate() - 1);
  const periodEndStr = periodEnd.toISOString().slice(0, 10);
  const now = new Date();
  const createdAt =
    `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}` +
    `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}000`;
  const fiscalYearStart = `${periodStart.slice(0, 4)}0101`;

  const header1 = [
    csvField("EXTF"),
    "700",
    "21",
    csvField("Buchungsstapel"),
    "7",
    createdAt,
    "",
    csvField(config.berater_nr),
    csvField(config.mandant_nr),
    fiscalYearStart,
    "4",
    compact(periodStart),
    compact(periodEndStr),
    csvField("GastroHub Export"),
    "",
    "1",
    "",
    "0",
    csvField("EUR"),
  ].join(";");

  const header2 = [
    "Umsatz (ohne Soll/Haben-Kz)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Kurs",
    "Basis-Umsatz",
    "WKZ Basis-Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "BU-Schlüssel",
    "Belegdatum",
    "Belegfeld 1",
    "Belegfeld 2",
    "Skonto",
    "Buchungstext",
  ]
    .map(csvField)
    .join(";");

  const rows: string[] = [];
  for (const day of days) {
    if (day.food > 0) {
      rows.push(row(day.food, "S", config.konto_bank, config.konto_food, ddmm(day.date), "Speisenumsatz"));
    }
    if (day.drink > 0) {
      rows.push(row(day.drink, "S", config.konto_bank, config.konto_drink, ddmm(day.date), "Getraenkeumsatz"));
    }
  }
  if (wages > 0) {
    rows.push(row(wages, "H", config.konto_bank, config.konto_wages, ddmm(periodEndStr), "Loehne"));
  }
  if (expenses > 0) {
    rows.push(row(expenses, "H", config.konto_bank, config.konto_expenses, ddmm(periodEndStr), "Fixkosten"));
  }

  return "﻿" + [header1, header2, ...rows].join("\r\n");
}

export function datevFilename(periodStart: string): string {
  return `gastrobuch-datev-${periodStart.slice(0, 7)}.csv`;
}
