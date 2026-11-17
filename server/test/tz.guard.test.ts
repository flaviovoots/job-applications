import { describe, expect, it } from "vitest";

describe("time zone guard", () => {
  it("has a non-zero offset in January", () => {
    expect(new Date(2026, 0, 15).getTimezoneOffset()).not.toBe(0);
  });

  it("has a non-zero offset in July", () => {
    expect(new Date(2026, 6, 15).getTimezoneOffset()).not.toBe(0);
  });
});
