// Free, keyless Aladhan API — same call gives both today's prayer times AND
// the Hijri date, so one request is enough to know "is it Ramadan right
// now" and "when is Maghrib today" without a separate Hijri-calendar
// library. Network failures degrade to null (no Ramadan banner shown)
// instead of crashing the public menu — same graceful-degradation pattern
// as every other optional integration in this app.
export type RamadanStatus = {
  isRamadan: boolean;
  hijriDay: number;
  hijriMonthName: string;
  hijriYear: number;
  maghrib: string;
};

export async function getRamadanStatus(city: string, country: string): Promise<RamadanStatus | null> {
  if (!city.trim()) return null;

  try {
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=4`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: {
        timings?: { Maghrib?: string };
        date?: { hijri?: { day?: string; month?: { en?: string }; year?: string } };
      };
    };

    const hijri = json.data?.date?.hijri;
    const maghrib = json.data?.timings?.Maghrib;
    if (!hijri?.month?.en || !hijri.day || !hijri.year || !maghrib) return null;

    return {
      isRamadan: hijri.month.en.toLowerCase() === "ramadan",
      hijriDay: Number(hijri.day),
      hijriMonthName: hijri.month.en,
      hijriYear: Number(hijri.year),
      // Aladhan returns "18:45 (+03)" — trim the zone suffix for a clean display.
      maghrib: maghrib.split(" ")[0],
    };
  } catch {
    return null;
  }
}
