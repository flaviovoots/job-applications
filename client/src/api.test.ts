import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./api";
import { jsonResponse } from "./test/responses";

const UNREACHABLE = "Couldn't reach the server. Try again.";

function mockFetch(response: Response) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(response);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch", () => {
  it("resolves a 204 to undefined", async () => {
    mockFetch(new Response(null, { status: 204 }));

    await expect(apiFetch("/api/thing", { method: "DELETE" })).resolves.toBe(
      undefined,
    );
  });

  it("parses a JSON success and sends a GET with credentials and no body", async () => {
    const fetchSpy = mockFetch(jsonResponse(200, { email: "a@example.com" }));

    await expect(apiFetch("/api/me")).resolves.toEqual({
      email: "a@example.com",
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/me", {
      method: "GET",
      credentials: "same-origin",
      headers: {},
      body: undefined,
    });
  });

  it("throws the server's error, fields and requestId on a JSON error", async () => {
    mockFetch(
      jsonResponse(400, {
        error: "Invalid input",
        fields: { company: "Required" },
        requestId: "req-1",
      }),
    );

    const failure = apiFetch("/api/applications", {
      method: "POST",
      body: {},
    });

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 400,
      error: "Invalid input",
      message: "Invalid input",
      fields: { company: "Required" },
      requestId: "req-1",
    });
  });

  it.each([200, 502])(
    "throws status 0 on an HTML answer with status %i",
    async (status) => {
      mockFetch(
        new Response("<!doctype html><p>Loading</p>", {
          status,
          headers: { "Content-Type": "text/html" },
        }),
      );

      await expect(apiFetch("/api/me")).rejects.toMatchObject({
        status: 0,
        error: UNREACHABLE,
      });
    },
  );

  it("throws status 0 when the body parses but the Content-Type isn't JSON", async () => {
    mockFetch(
      new Response('{"email":"a@example.com"}', {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );

    await expect(apiFetch("/api/me")).rejects.toMatchObject({
      status: 0,
      error: UNREACHABLE,
    });
  });

  it("throws status 0 on a JSON answer whose body doesn't parse", async () => {
    mockFetch(
      new Response("{not json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiFetch("/api/me")).rejects.toMatchObject({
      status: 0,
      error: UNREACHABLE,
    });
  });

  it("throws status 0 when fetch rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    const failure = apiFetch("/api/me");

    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({
      status: 0,
      error: UNREACHABLE,
    });
  });

  it.each(["POST", "PATCH"] as const)(
    "sends {} as JSON on a %s without a body",
    async (method) => {
      const fetchSpy = mockFetch(new Response(null, { status: 204 }));

      await apiFetch("/auth/logout", { method });

      expect(fetchSpy).toHaveBeenCalledWith("/auth/logout", {
        method,
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    },
  );

  it("sends a given body as JSON", async () => {
    const fetchSpy = mockFetch(jsonResponse(200, { email: "a@example.com" }));

    await apiFetch("/auth/google", {
      method: "POST",
      body: { credential: "token" },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/auth/google",
      expect.objectContaining({ body: '{"credential":"token"}' }),
    );
  });
});
