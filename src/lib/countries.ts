export type CountryCode = "de" | "sa" | "ae" | "uk";

type CountryConfig = {
  flag: string;
  code: string;
  currency: string;
  currencyPos: "before" | "after";
  locale: string;
  vatMode: "split" | "flat";
  vatFood?: number;
  vatDrink?: number;
  vatRate?: number;
  minijob: number | null;
  minWage: number | null;
  hygieneLaw: { de: string; ar: string; en: string };
};

// Tax/currency rules per country. Deliberately app code, not a DB table —
// these are legal rules that change rarely and globally, not per-restaurant
// user data.
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  de: {
    flag: "🇩🇪",
    code: "DE",
    currency: "€",
    currencyPos: "before",
    locale: "de-DE",
    vatMode: "split",
    vatFood: 7,
    vatDrink: 19,
    minijob: 603,
    minWage: 13.9,
    hygieneLaw: {
      de: "LMHV / EU 852/2004",
      ar: "LMHV / لائحة الاتحاد الأوروبي 852/2004",
      en: "LMHV / EU 852/2004",
    },
  },
  sa: {
    flag: "🇸🇦",
    code: "SA",
    currency: "ر.س",
    currencyPos: "after",
    locale: "ar-SA",
    vatMode: "flat",
    vatRate: 15,
    minijob: null,
    minWage: null,
    hygieneLaw: {
      de: "SFDA (Saudi Food & Drug Authority)",
      ar: "الهيئة العامة للغذاء والدواء (SFDA)",
      en: "SFDA (Saudi Food & Drug Authority)",
    },
  },
  ae: {
    flag: "🇦🇪",
    code: "AE",
    currency: "د.إ",
    currencyPos: "after",
    locale: "ar-AE",
    vatMode: "flat",
    vatRate: 5,
    minijob: null,
    minWage: null,
    hygieneLaw: {
      de: "ADAFSA / Dubai Municipality",
      ar: "ADAFSA / بلدية دبي",
      en: "ADAFSA / Dubai Municipality",
    },
  },
  uk: {
    flag: "🇬🇧",
    code: "GB",
    currency: "£",
    currencyPos: "before",
    locale: "en-GB",
    vatMode: "flat",
    vatRate: 20,
    minijob: null,
    minWage: 12.71,
    hygieneLaw: {
      de: "Food Safety Act 1990 / FSA Food Hygiene Rating Scheme",
      ar: "قانون سلامة الغذاء 1990 / نظام تقييم الهايجين FSA",
      en: "Food Safety Act 1990 / FSA Food Hygiene Rating Scheme",
    },
  },
};

export function fmtMoney(amount: number, country: CountryCode): string {
  const conf = COUNTRIES[country];
  const num = (amount || 0).toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return conf.currencyPos === "before" ? `${conf.currency} ${num}` : `${num} ${conf.currency}`;
}
