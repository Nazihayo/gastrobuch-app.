import { describe, expect, it } from "vitest";
import { toStripeCountry, toStripeCurrency } from "./stripe";

describe("toStripeCountry", () => {
  it("maps uk to the ISO code GB", () => {
    expect(toStripeCountry("uk")).toBe("GB");
  });

  it("passes other country codes through uppercased", () => {
    expect(toStripeCountry("de")).toBe("DE");
    expect(toStripeCountry("sa")).toBe("SA");
    expect(toStripeCountry("ae")).toBe("AE");
  });
});

describe("toStripeCurrency", () => {
  it("maps each supported country to its currency", () => {
    expect(toStripeCurrency("de")).toBe("eur");
    expect(toStripeCurrency("sa")).toBe("sar");
    expect(toStripeCurrency("ae")).toBe("aed");
    expect(toStripeCurrency("uk")).toBe("gbp");
  });
});
