import { render, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { googleStub } from "../test/google";
import { jsonResponse } from "../test/responses";

// GoogleButton remembers in module state that Google's library is set up for
// this page load, so each case imports a fresh copy.
async function importGoogleButton() {
  vi.resetModules();
  return (await import("./GoogleButton")).default;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("GoogleButton", () => {
  it("renders Google's button into its element when the library has loaded", async () => {
    const GoogleButton = await importGoogleButton();
    const { renderButton } = googleStub().accounts.id;

    const { container } = render(<GoogleButton />);

    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    const parent = vi.mocked(renderButton).mock.lastCall?.[0] ?? null;
    expect(container.contains(parent)).toBe(true);
  });

  it("waits for onGoogleLibraryLoad when the library hasn't loaded yet", async () => {
    const GoogleButton = await importGoogleButton();
    const google = googleStub();
    const { renderButton } = google.accounts.id;
    delete window.google;

    const { container } = render(<GoogleButton />);
    expect(window.onGoogleLibraryLoad).toBeTypeOf("function");
    expect(renderButton).not.toHaveBeenCalled();

    window.google = google;
    window.onGoogleLibraryLoad?.();

    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    const parent = vi.mocked(renderButton).mock.lastCall?.[0] ?? null;
    expect(container.contains(parent)).toBe(true);
  });

  it("initializes once per page load and renders on each mount", async () => {
    const GoogleButton = await importGoogleButton();
    const { initialize, renderButton } = googleStub().accounts.id;

    const first = render(<GoogleButton />);
    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
    first.unmount();
    render(<GoogleButton />);

    await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(2));
    expect(initialize).toHaveBeenCalledTimes(1);
  });

  it("renders once under StrictMode, which runs effects twice", async () => {
    const GoogleButton = await importGoogleButton();
    const { renderButton } = googleStub().accounts.id;

    render(
      <StrictMode>
        <GoogleButton />
      </StrictMode>,
    );

    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(renderButton).toHaveBeenCalledTimes(1);
  });

  it("initializes with the client id, the popup and a callback that signs in", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { email: "alice@example.com" }));
    const GoogleButton = await importGoogleButton();
    const { initialize } = googleStub().accounts.id;

    render(<GoogleButton />);

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    const config = vi.mocked(initialize).mock.lastCall?.[0];
    expect(config).toMatchObject({
      client_id: "test-client.apps.googleusercontent.com",
      ux_mode: "popup",
    });

    config?.callback({ credential: "token" });

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        "/auth/google",
        expect.objectContaining({
          method: "POST",
          body: '{"credential":"token"}',
        }),
      ),
    );
  });
});
