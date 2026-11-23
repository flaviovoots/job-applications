import { describe, expect, it, vi } from "vitest";
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

  it("stubs window.google (used and removed here, checked by the next test)", () => {
    expect(vi.isMockFunction(window.google?.accounts.id.initialize)).toBe(true);
    expect(vi.isMockFunction(window.google?.accounts.id.renderButton)).toBe(
      true,
    );
    window.google?.accounts.id.initialize({
      client_id: "guard",
      callback: () => {},
    });
    delete window.google;
  });

  it("starts each test with a fresh window.google stub", () => {
    expect(window.google?.accounts.id.initialize).not.toHaveBeenCalled();
  });

  it("lets a test set window.onGoogleLibraryLoad (checked by the next test)", () => {
    window.onGoogleLibraryLoad = () => {};
    expect(window.onGoogleLibraryLoad).toBeTypeOf("function");
  });

  it("starts each test without window.onGoogleLibraryLoad", () => {
    expect(window.onGoogleLibraryLoad).toBeUndefined();
  });
});
