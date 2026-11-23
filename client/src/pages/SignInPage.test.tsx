import { act, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signInWithCredential } from "../session";
import { waitForGoogleButton } from "../test/google";
import { renderWithProviders } from "../test/render";
import { jsonResponse } from "../test/responses";
import SignInPage from "./SignInPage";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("SignInPage", () => {
  it("shows the app's name as the page heading and Google's button", async () => {
    const { container } = renderWithProviders(<SignInPage />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Job Applications Tracker",
      }),
    ).toBeTruthy();
    await waitForGoogleButton(container);
  });

  it("shows no message before a sign-in attempt", () => {
    renderWithProviders(<SignInPage />);

    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows the refusal message after a 403 from POST /auth/google", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(403, { error: "Not allowed", requestId: "req-1" }),
    );
    renderWithProviders(<SignInPage />);

    await act(() => signInWithCredential("token"));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "This Google account is not allowed to use this app.",
    );
  });

  it("shows 'Sign-in failed. Try again.' after a 401 from POST /auth/google", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(401, { error: "Invalid sign-in token", requestId: "req-1" }),
    );
    renderWithProviders(<SignInPage />);

    await act(() => signInWithCredential("token"));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Sign-in failed. Try again.",
    );
  });
});
