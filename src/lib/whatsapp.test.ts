import { describe, expect, it } from "vitest";
import { buildWhatsAppLink, toWhatsAppDigits } from "./whatsapp";

describe("toWhatsAppDigits", () => {
  it("replaces a German local leading zero with the country code", () => {
    expect(toWhatsAppDigits("0151 2345678", "de")).toBe("4915123 45678".replace(/\s/g, ""));
  });

  it("keeps a number already in international + format", () => {
    expect(toWhatsAppDigits("+49 151 2345678", "de")).toBe("491512345678");
  });

  it("strips a leading 00 international prefix", () => {
    expect(toWhatsAppDigits("0049 151 2345678", "de")).toBe("491512345678");
  });

  it("leaves a number that already starts with the dial code untouched", () => {
    expect(toWhatsAppDigits("971501234567", "ae")).toBe("971501234567");
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with url-encoded text", () => {
    const link = buildWhatsAppLink("0151 2345678", "de", "Hello there!");
    expect(link).toBe("https://wa.me/491512345678?text=Hello%20there!");
  });
});
