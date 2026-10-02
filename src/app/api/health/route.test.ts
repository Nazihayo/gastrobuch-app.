import { describe, expect, it } from "vitest";
import { isMissingTableError } from "./route";

describe("isMissingTableError", () => {
  it("recognizes Postgres's undefined_table error code", () => {
    expect(isMissingTableError({ code: "42P01", message: "something" })).toBe(true);
  });

  it("recognizes the relation-does-not-exist message as a fallback", () => {
    expect(isMissingTableError({ message: 'relation "orders" does not exist' })).toBe(true);
  });

  it("returns false for an unrelated error", () => {
    expect(isMissingTableError({ code: "23505", message: "duplicate key value" })).toBe(false);
  });

  it("returns false when there is no error", () => {
    expect(isMissingTableError(null)).toBe(false);
  });
});
