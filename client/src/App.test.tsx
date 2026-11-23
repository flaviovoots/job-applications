import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import App from "./App";
import { meKey, signInWithCredential } from "./session";
import { queryClient } from "./queryClient";
import { waitForGoogleButton } from "./test/google";
import { renderWithProviders } from "./test/render";
import { jsonResponse, notSignedIn } from "./test/responses";

const email = "alice@example.com";

// Each test queues its fetch answers before this renders. The first one is
// for GET /api/me.
async function renderSignedIn() {
  const rendered = renderWithProviders(<App />);
  await screen.findByText(email);
  return rendered;
}

// A 401 from any /api/* call marks ['me'] signed out.
async function endSessionMidUse() {
  await act(() => apiFetch("/api/applications").catch(() => undefined));
}

function heading() {
  return screen.getByRole("heading", {
    level: 1,
    name: "Job Applications Tracker",
  });
}

// The <header> element's role is "banner"; SignedOutBanner's is "status".
function header() {
  return screen.getByRole("banner");
}

function expectAbove(first: Element, second: Element) {
  expect(
    first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("App", () => {
  it("shows the sign-in page when GET /api/me answers 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(notSignedIn());

    const { container } = renderWithProviders(<App />);

    await waitForGoogleButton(container);
    expect(heading()).toBeTruthy();
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("shows the email and Sign out in a header above the page when GET /api/me answers 200", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(200, { email }),
    );

    await renderSignedIn();

    expect(within(header()).getByText(email)).toBeTruthy();
    expect(
      within(header()).getByRole("button", { name: "Sign out" }),
    ).toBeTruthy();
    expectAbove(header(), heading());
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows nothing while GET /api/me loads", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(() => {}));

    const { container } = renderWithProviders(<App />);

    expect(container.innerHTML).toBe("");
  });

  it("shows 'Couldn't reach the server.' when GET /api/me fails, and Try again refetches it", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(200, { email }));
    renderWithProviders(<App />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Couldn't reach the server.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    const appHeader = await screen.findByRole("banner");
    expect(within(appHeader).getByText(email)).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps the page when a refetch of ['me'] fails mid-session", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await renderSignedIn();

    await act(() => queryClient.refetchQueries({ queryKey: meKey }));
    // TanStack Query tells hooks about the change on a timer. Waiting one
    // timer tick lets App re-render with the failed refetch before the
    // checks; without it, they would pass before App saw the error.
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(queryClient.getQueryState(meKey)?.status).toBe("error");
    expect(within(header()).getByText(email)).toBeTruthy();
    expect(screen.queryByText("Couldn't reach the server.")).toBeNull();
  });

  describe("signed out mid-session", () => {
    it("shows the banner above the page and keeps the page", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockResolvedValueOnce(notSignedIn());
      await renderSignedIn();

      await endSessionMidUse();

      const banner = await screen.findByRole("status");
      expectAbove(banner, heading());
      await waitForGoogleButton(banner);
      expect(within(header()).getByText(email)).toBeTruthy();
    });

    it("keeps the banner open after a refused re-sign-in", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockResolvedValueOnce(notSignedIn())
        .mockResolvedValueOnce(
          jsonResponse(403, { error: "Not allowed", requestId: "req-1" }),
        );
      await renderSignedIn();
      await endSessionMidUse();
      const banner = await screen.findByRole("status");

      await act(() => signInWithCredential("token"));

      expect((await within(banner).findByRole("alert")).textContent).toBe(
        "This Google account is not allowed to use this app.",
      );
      expect(screen.getByRole("status")).toBe(banner);
    });

    it("closes the banner after a successful re-sign-in", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockResolvedValueOnce(notSignedIn())
        .mockResolvedValueOnce(jsonResponse(200, { email }));
      await renderSignedIn();
      await endSessionMidUse();
      await screen.findByRole("status");

      await act(() => signInWithCredential("token"));

      await waitFor(() => expect(screen.queryByRole("status")).toBeNull());
      expect(within(header()).getByText(email)).toBeTruthy();
    });
  });

  describe("Sign out", () => {
    it("shows the sign-in page after POST /auth/logout succeeds", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockResolvedValueOnce(new Response(null, { status: 204 }));
      const { container } = await renderSignedIn();

      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

      await waitFor(() => expect(screen.queryByRole("banner")).toBeNull());
      expect(screen.queryByText(email)).toBeNull();
      await waitForGoogleButton(container);
    });

    it("stays signed in and says so when POST /auth/logout fails", async () => {
      vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockRejectedValueOnce(new TypeError("Failed to fetch"));
      await renderSignedIn();

      fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

      expect((await screen.findByRole("alert")).textContent).toBe(
        "Couldn't sign out. Try again.",
      );
      expect(within(header()).getByText(email)).toBeTruthy();
      expect(
        within(header()).getByRole("button", { name: "Sign out" }),
      ).toHaveProperty("disabled", false);
    });
  });
});
