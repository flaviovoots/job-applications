import { act, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInWithCredential } from "../session";
import { waitForGoogleButton } from "../test/google";
import { renderWithProviders } from "../test/render";
import { jsonResponse } from "../test/responses";
import SignedOutBanner from "./SignedOutBanner";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SignedOutBanner", () => {
  it("shows 'Signed out: sign in again' with Google's button", async () => {
    renderWithProviders(<SignedOutBanner />);

    const banner = screen.getByRole("status");
    expect(within(banner).getByText("Signed out: sign in again")).toBeTruthy();
    expect(within(banner).queryByRole("alert")).toBeNull();
    await waitForGoogleButton(banner);
  });

  it("shows the refusal message inside the banner after a 403, and stays", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(403, { error: "Not allowed", requestId: "req-1" }),
    );
    renderWithProviders(<SignedOutBanner />);

    await act(() => signInWithCredential("token"));

    const banner = screen.getByRole("status");
    expect((await within(banner).findByRole("alert")).textContent).toBe(
      "This Google account is not allowed to use this app.",
    );
    expect(within(banner).getByText("Signed out: sign in again")).toBeTruthy();
  });
});
