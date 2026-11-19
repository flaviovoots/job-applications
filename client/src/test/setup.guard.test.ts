import { describe, expect, it } from "vitest";
import { queryClient } from "../queryClient";

describe("test setup guard", () => {
  it("turns query retry off", () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
  });

  it("keeps mutations from retrying", () => {
    expect(queryClient.getDefaultOptions().mutations?.retry).toBe(false);
  });

  it("caches data (read by the next test)", () => {
    queryClient.setQueryData(["guard"], "leak");
    expect(queryClient.getQueryData(["guard"])).toBe("leak");
  });

  it("starts each test with an empty cache", () => {
    expect(queryClient.getQueryData(["guard"])).toBeUndefined();
  });
});
