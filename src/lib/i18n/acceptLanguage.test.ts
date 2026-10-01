import { describe, expect, it } from "vitest";
import { pickLocaleFromAcceptLanguage } from "./acceptLanguage";

describe("pickLocaleFromAcceptLanguage", () => {
  it("picks the highest-quality supported language", () => {
    expect(pickLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,de;q=0.8,en;q=0.7")).toBe("de");
  });

  it("matches a region-qualified tag by its primary subtag", () => {
    expect(pickLocaleFromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("respects explicit quality values over header order", () => {
    expect(pickLocaleFromAcceptLanguage("en;q=0.5,ar;q=0.9")).toBe("ar");
  });

  it("returns null when nothing is supported", () => {
    expect(pickLocaleFromAcceptLanguage("fr-FR,fr;q=0.9,es;q=0.8")).toBeNull();
  });

  it("returns null for an empty or missing header", () => {
    expect(pickLocaleFromAcceptLanguage(null)).toBeNull();
    expect(pickLocaleFromAcceptLanguage("")).toBeNull();
  });

  it("defaults to quality 1 for a tag with no q value", () => {
    expect(pickLocaleFromAcceptLanguage("ar")).toBe("ar");
  });
});
