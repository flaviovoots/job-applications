import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/http/logger.js";
import { testConfig } from "./helpers.js";

const app = createApp({
  config: testConfig(),
  logger: createLogger({ level: "silent" }),
});

const requestIdPattern = /^[0-9a-f-]{36}$/;

describe("createApp", () => {
  it.each(["/api/anything", "/auth/anything"])(
    "GET %s gives a JSON 404 with a requestId",
    async (path) => {
      const res = await request(app).get(path);

      expect(res.status).toBe(404);
      expect(res.type).toBe("application/json");
      expect(res.body).toEqual({
        error: "Not found",
        requestId: expect.any(String),
      });
    },
  );
  it("sets X-Request-Id to the 404's requestId", async () => {
    const res = await request(app).get("/api/anything");

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
});
