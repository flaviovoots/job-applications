import { describe, expect, it } from "vitest";
import { shouldRetry } from "./queryClient";

describe("shouldRetry", () => {
  it.each([400, 401, 403, 404, 499])("does not retry a %i", (status) => {
    expect(shouldRetry(0, { status })).toBe(false);
  });

  it("retries a 500 once", () => {
    expect(shouldRetry(0, { status: 500 })).toBe(true);
    expect(shouldRetry(1, { status: 500 })).toBe(false);
  });

  it("treats an error without a numeric status as status 0", () => {
    expect(shouldRetry(0, new Error("network"))).toBe(true);
    expect(shouldRetry(0, { status: "500" })).toBe(true);
    expect(shouldRetry(1, new Error("network"))).toBe(false);
  });
});
