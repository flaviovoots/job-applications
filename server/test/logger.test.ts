import express from "express";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createLogger, httpLoggerOptions } from "../src/http/logger.js";
import { captureStream } from "./helpers.js";

describe("request logging", () => {
  it("redacts cookie, authorization and set-cookie, and never logs the body", async () => {
    const { lines, stream } = captureStream();
    const app = express();
    app.use(pinoHttp(httpLoggerOptions(createLogger({ destination: stream }))));
    app.use(express.json());
    app.post("/", (_req, res) => {
      res.cookie("sid", "secret-session-cookie").json({ ok: true });
    });

    await request(app)
      .post("/")
      .set("Cookie", "sid=secret-request-cookie")
      .set("Authorization", "Bearer secret-token")
      .send({ password: "secret-body-value" });

    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry.req.headers.cookie).toBe("[Redacted]");
    expect(entry.req.headers.authorization).toBe("[Redacted]");
    expect(entry.res.headers["set-cookie"]).toBe("[Redacted]");
    expect(entry.req.body).toBeUndefined();
    expect(lines[0]).not.toContain("secret");
  });
});
