import express from "express";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../src/http/errors.js";
import { createLogger, httpLoggerOptions } from "../src/http/logger.js";
import { writeGuard } from "../src/http/security.js";

const appOrigin = "http://localhost:5173";

const app = express();
app.use(pinoHttp(httpLoggerOptions(createLogger({ level: "silent" }))));
app.use(writeGuard(appOrigin));
app.all("/", (_req, res) => {
  res.status(204).end();
});
app.use(errorHandler);

const requestId = expect.stringMatching(/^[0-9a-f-]{36}$/);
const forbidden = { error: "Forbidden", requestId };

describe("writeGuard", () => {
  it("refuses a form-encoded POST with 415", async () => {
    const res = await request(app)
      .post("/")
      .set("Origin", appOrigin)
      .type("form")
      .send("a=1");

    expect(res.status).toBe(415);
    expect(res.body).toEqual({ error: "Send JSON", requestId });
  });

  it("refuses a POST from a foreign Origin with 403", async () => {
    const res = await request(app)
      .post("/")
      .set("Origin", "https://evil.example.com")
      .send({});

    expect(res.status).toBe(403);
    expect(res.body).toEqual(forbidden);
  });

  it.each(["post", "delete"] as const)(
    "refuses a %s with no Origin with 403",
    async (method) => {
      const res = await request(app)[method]("/").send({});

      expect(res.status).toBe(403);
      expect(res.body).toEqual(forbidden);
    },
  );

  it("lets a GET with no Origin through", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(204);
  });
});
