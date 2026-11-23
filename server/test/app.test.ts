import request from "supertest";
import type { Express } from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  connectTestDb,
  disconnectTestDb,
  makeTestApp,
  signIn,
} from "./helpers.js";

let app: Express;

beforeAll(async () => {
  await connectTestDb();
  ({ app } = makeTestApp());
});

afterAll(disconnectTestDb);

const requestIdPattern = /^[0-9a-f-]{36}$/;

describe("createApp", () => {
  it("GET /auth/anything gives a JSON 404 with a requestId", async () => {
    const res = await request(app).get("/auth/anything");

    expect(res.status).toBe(404);
    expect(res.type).toBe("application/json");
    expect(res.body).toEqual({
      error: "Not found",
      requestId: expect.any(String),
    });
  });

  it("answers an anonymous GET /api/anything with 401, before the 404", async () => {
    const res = await request(app).get("/api/anything");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Not signed in",
      requestId: expect.stringMatching(requestIdPattern),
    });
  });

  it("answers a signed-in GET /api/anything with the JSON 404", async () => {
    const agent = request.agent(app);
    await signIn(agent, "alice@example.com");

    const res = await agent.get("/api/anything");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Not found",
      requestId: expect.stringMatching(requestIdPattern),
    });
  });

  it("sets X-Request-Id to the 404's requestId", async () => {
    const res = await request(app).get("/auth/anything");

    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
    expect(res.headers["x-request-id"]).toBe(res.body.requestId);
  });

  it("answers a missing asset with the JSON 404, not index.html", async () => {
    const res = await request(app).get("/assets/missing.js");

    expect(res.status).toBe(404);
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
    expect(res.body).toEqual({
      error: "Not found",
      requestId: res.headers["x-request-id"],
    });
  });

  it("serves an asset with a one-year immutable cache", async () => {
    const res = await request(app).get("/assets/test.js");

    expect(res.status).toBe(200);
    expect(res.text).toContain("fixture asset");
    expect(res.headers["cache-control"]).toContain("max-age=31536000");
    expect(res.headers["cache-control"]).toContain("immutable");
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
  });

  it.each(["/", "/anything"])(
    "GET %s gives index.html with no-cache",
    async (path) => {
      const res = await request(app).get(path);

      expect(res.status).toBe(200);
      expect(res.type).toBe("text/html");
      expect(res.text).toContain("fixture index");
      expect(res.headers["cache-control"]).toBe("no-cache");
      expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
    },
  );

  it("sends the CSP, COOP and Referrer-Policy that Google sign-in needs", async () => {
    const res = await request(app).get("/");

    const csp = res.headers["content-security-policy"];
    for (const directive of [
      "script-src",
      "frame-src",
      "connect-src",
      "style-src",
    ]) {
      expect(csp).toContain(
        `${directive} 'self' https://accounts.google.com/gsi/`,
      );
    }
    expect(csp).toContain("frame-ancestors 'none'");
    expect(res.headers["cross-origin-opener-policy"]).toBe(
      "same-origin-allow-popups",
    );
    expect(res.headers["referrer-policy"]).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
  });

  it.each([
    { name: "malformed JSON", body: "{", status: 400 },
    {
      name: "a body over 100 KB",
      body: JSON.stringify({ a: "x".repeat(100 * 1024) }),
      status: 413,
    },
  ])("POST /auth/google with $name gives $status", async ({ body, status }) => {
    const res = await request(app)
      .post("/auth/google")
      .set("Origin", "http://localhost:5173")
      .type("json")
      .send(body);

    expect(res.status).toBe(status);
    expect(res.body).toEqual({
      error: "Invalid request body",
      requestId: expect.stringMatching(requestIdPattern),
    });
  });

  it("refuses a JSON POST with no Origin with 403", async () => {
    const res = await request(app).post("/auth/google").send({});

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Forbidden",
      requestId: expect.stringMatching(requestIdPattern),
    });
  });
});
