import { describe, expect, it, vi, afterEach } from "vitest";
import { getRamadanStatus } from "./prayerTimes";

describe("getRamadanStatus", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when city is blank", async () => {
    expect(await getRamadanStatus("", "SA")).toBeNull();
  });

  it("parses a successful Aladhan response during Ramadan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            timings: { Maghrib: "18:12 (+03)" },
            date: { hijri: { day: "14", month: { en: "Ramadan" }, year: "1447" } },
          },
        }),
      })
    );

    const status = await getRamadanStatus("Riyadh", "SA");
    expect(status).toEqual({
      isRamadan: true,
      hijriDay: 14,
      hijriMonthName: "Ramadan",
      hijriYear: 1447,
      maghrib: "18:12",
    });
  });

  it("reports isRamadan false outside Ramadan", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            timings: { Maghrib: "17:45 (+03)" },
            date: { hijri: { day: "2", month: { en: "Shawwal" }, year: "1447" } },
          },
        }),
      })
    );

    const status = await getRamadanStatus("Riyadh", "SA");
    expect(status?.isRamadan).toBe(false);
  });

  it("returns null when the API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await getRamadanStatus("Riyadh", "SA")).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    expect(await getRamadanStatus("Riyadh", "SA")).toBeNull();
  });

  it("returns null when the response is missing expected fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: {} }),
      })
    );
    expect(await getRamadanStatus("Riyadh", "SA")).toBeNull();
  });
});
