import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./api";
import { queryClient } from "./queryClient";
import {
  meKey,
  signInErrorKey,
  signInWithCredential,
  signOut,
  useSession,
  useSignInError,
} from "./session";
import { jsonResponse, notSignedIn } from "./test/responses";

const email = "alice@example.com";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(QueryClientProvider, { client: queryClient }, children);
}

// TanStack Query tells hooks about a cache change on a timer, so the hook's
// data is read with waitFor, even right after the change.
async function renderSignedIn() {
  const rendered = renderHook(() => useSession(), { wrapper });
  await waitFor(() => expect(rendered.result.current.data).toEqual({ email }));
  return rendered;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSession", () => {
  it("gives { email } when GET /api/me answers 200", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }));

    await renderSignedIn();

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gives null when the first GET /api/me answers 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(notSignedIn());

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("is an error, not null, when GET /api/me fails another way", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(500, { error: "Something went wrong", requestId: "req-1" }),
    );

    const { result } = renderHook(() => useSession(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toMatchObject({ status: 500 });
  });

  it("keeps the email, signed out, when a refetch of ['me'] answers 401", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }))
      .mockResolvedValueOnce(notSignedIn());
    const { result } = await renderSignedIn();

    await act(() => result.current.refetch());

    await waitFor(() =>
      expect(result.current.data).toEqual({ email, signedOut: true }),
    );
  });
});

describe("markSignedOut", () => {
  it("marks the session signed out on a 401 from /api/*, keeping the email", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }))
      .mockResolvedValueOnce(notSignedIn());
    const { result } = await renderSignedIn();

    await act(() =>
      expect(apiFetch("/api/applications")).rejects.toMatchObject({
        status: 401,
      }),
    );

    await waitFor(() =>
      expect(result.current.data).toEqual({ email, signedOut: true }),
    );
  });

  it("leaves the session alone on a 401 from /auth/google", async () => {
    queryClient.setQueryData(meKey, { email });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(401, { error: "Invalid sign-in token", requestId: "req-1" }),
    );

    await expect(
      apiFetch("/auth/google", { method: "POST", body: { credential: "x" } }),
    ).rejects.toMatchObject({ status: 401 });

    expect(queryClient.getQueryData(meKey)).toEqual({ email });
  });

  it.each([
    ["never signed in", null],
    ["still loading", undefined],
  ])("changes nothing while ['me'] holds no email (%s)", async (_, value) => {
    if (value !== undefined) queryClient.setQueryData(meKey, value);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(notSignedIn());

    await expect(apiFetch("/api/applications")).rejects.toMatchObject({
      status: 401,
    });

    expect(queryClient.getQueryData(meKey)).toBe(value);
  });
});

describe("signInWithCredential", () => {
  it("posts the credential, sets ['me'] and refetches the other queries on a 200", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(notSignedIn())
      .mockResolvedValueOnce(jsonResponse(200, { email }));
    const listFn = vi.fn().mockResolvedValue([]);
    const { result } = renderHook(
      () => ({
        session: useSession(),
        list: useQuery({ queryKey: ["applications"], queryFn: listFn }),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.session.data).toBeNull());
    await waitFor(() => expect(result.current.list.isSuccess).toBe(true));

    await act(() => signInWithCredential("token"));

    await waitFor(() => expect(result.current.session.data).toEqual({ email }));
    expect(listFn).toHaveBeenCalledTimes(2);
    // ['me'] itself isn't fetched again: one GET /api/me, one sign-in.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/auth/google",
      expect.objectContaining({
        method: "POST",
        body: '{"credential":"token"}',
      }),
    );
  });

  it("stores 'refused' on a 403 and leaves ['me'] as it was", async () => {
    queryClient.setQueryData(meKey, { email, signedOut: true });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(403, { error: "Not allowed", requestId: "req-1" }),
    );
    const { result } = renderHook(() => useSignInError(), { wrapper });
    expect(result.current).toBeNull();

    await act(() => signInWithCredential("token"));

    await waitFor(() => expect(result.current).toBe("refused"));
    expect(queryClient.getQueryData(meKey)).toEqual({
      email,
      signedOut: true,
    });
  });

  it.each([
    [
      "a 401",
      () =>
        Promise.resolve(
          jsonResponse(401, {
            error: "Invalid sign-in token",
            requestId: "req-1",
          }),
        ),
    ],
    [
      "a 500",
      () =>
        Promise.resolve(
          jsonResponse(500, {
            error: "Something went wrong",
            requestId: "req-1",
          }),
        ),
    ],
    [
      "a rejected fetch",
      () => Promise.reject(new TypeError("Failed to fetch")),
    ],
  ])("stores 'failed' on %s and leaves ['me'] as it was", async (_, answer) => {
    queryClient.setQueryData(meKey, null);
    vi.spyOn(globalThis, "fetch").mockImplementationOnce(answer);
    const { result } = renderHook(() => useSignInError(), { wrapper });

    await act(() => signInWithCredential("token"));

    await waitFor(() => expect(result.current).toBe("failed"));
    expect(queryClient.getQueryData(meKey)).toBeNull();
  });

  it("clears the stored error when the next attempt starts", async () => {
    let answer: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(403, { error: "Not allowed", requestId: "req-1" }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
    const { result } = renderHook(() => useSignInError(), { wrapper });
    await act(() => signInWithCredential("first"));
    await waitFor(() => expect(result.current).toBe("refused"));

    const second = signInWithCredential("second");

    // Cleared while the second request is still waiting for its answer.
    await waitFor(() => expect(result.current).toBeNull());
    answer(jsonResponse(200, { email }));
    await act(() => second);
    expect(result.current).toBeNull();
    expect(queryClient.getQueryData(meKey)).toEqual({ email });
  });
});

describe("signOut", () => {
  it("posts /auth/logout, clears the cache and sets ['me'] to null", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const { result } = await renderSignedIn();
    queryClient.setQueryData(["applications"], [{ id: "app-1" }]);
    queryClient.setQueryData(signInErrorKey, "failed");

    await act(() => signOut());

    await waitFor(() => expect(result.current.data).toBeNull());
    expect(queryClient.getQueryData(["applications"])).toBeUndefined();
    expect(queryClient.getQueryData(signInErrorKey)).toBeUndefined();
    // ['me'] isn't fetched again: one GET /api/me, one logout.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "/auth/logout",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
  });

  it("throws and leaves the cache as it was when the logout fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(200, { email }))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { result } = await renderSignedIn();
    queryClient.setQueryData(["applications"], [{ id: "app-1" }]);

    await act(() =>
      expect(signOut()).rejects.toMatchObject({
        status: 0,
        error: "Couldn't reach the server. Try again.",
      }),
    );

    expect(result.current.data).toEqual({ email });
    expect(queryClient.getQueryData(["applications"])).toEqual([
      { id: "app-1" },
    ]);
  });
});
