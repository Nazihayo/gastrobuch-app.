import { describe, expect, it } from "vitest";
import { buildDatevExport, buildTipPoolDatevExport, datevFilename, type DatevConfig } from "./datev";

const config: DatevConfig = {
  konto_food: "8300",
  konto_drink: "8400",
  konto_wages: "4120",
  konto_expenses: "4200",
  konto_bank: "1000",
  berater_nr: "1001",
  mandant_nr: "1",
};

describe("buildDatevExport", () => {
  it("emits a two-line header followed by one row per non-zero booking", () => {
    const csv = buildDatevExport(
      [
        { date: "2026-09-05", food: 500.5, drink: 120 },
        { date: "2026-09-06", food: 300, drink: 0 },
      ],
      1500,
      800,
      config,
      "2026-09-01",
      "2026-10-01"
    );
    const lines = csv.replace(/^﻿/, "").split("\r\n");
    // header row 1 (EXTF metadata) + header row 2 (column names) + 3 food
    // rows + 1 drink row + 1 wages row + 1 expenses row
    expect(lines).toHaveLength(7);
    expect(lines[0]).toMatch(/^"EXTF";700;21;"Buchungsstapel"/);
    expect(lines[1]).toMatch(/^"Umsatz \(ohne Soll\/Haben-Kz\)"/);
  });

  it("formats amounts with a comma decimal and DDMM booking dates", () => {
    const csv = buildDatevExport(
      [{ date: "2026-09-05", food: 500.5, drink: 0 }],
      0,
      0,
      config,
      "2026-09-01",
      "2026-10-01"
    );
    const rows = csv.split("\r\n").slice(2);
    expect(rows[0]).toBe('500,50;S;EUR;;;;1000;8300;;0509;;;;"Speisenumsatz"');
  });

  it("books wages and expenses on the Haben side against the last day of the period", () => {
    const csv = buildDatevExport([], 1500, 800, config, "2026-09-01", "2026-10-01");
    const rows = csv.split("\r\n").slice(2);
    expect(rows).toEqual([
      '1500,00;H;EUR;;;;1000;4120;;3009;;;;"Loehne"',
      '800,00;H;EUR;;;;1000;4200;;3009;;;;"Fixkosten"',
    ]);
  });

  it("omits zero-amount lines entirely", () => {
    const csv = buildDatevExport(
      [{ date: "2026-09-05", food: 0, drink: 0 }],
      0,
      0,
      config,
      "2026-09-01",
      "2026-10-01"
    );
    expect(csv.split("\r\n")).toHaveLength(2); // just the two header rows
  });
});

describe("buildTipPoolDatevExport", () => {
  it("books the tip pool total on the Haben side against the booking's own period end", () => {
    const csv = buildTipPoolDatevExport(240, config, "2026-09-01", "2026-09-15");
    const rows = csv.split("\r\n").slice(2);
    expect(rows).toEqual(['240,00;H;EUR;;;;1000;4120;;1509;;;;"Trinkgeld-Verteilung"']);
  });

  it("omits the row when the total is zero", () => {
    const csv = buildTipPoolDatevExport(0, config, "2026-09-01", "2026-09-15");
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});

describe("datevFilename", () => {
  it("names the file after the period's year and month", () => {
    expect(datevFilename("2026-09-01")).toBe("gastrobuch-datev-2026-09.csv");
  });
});
