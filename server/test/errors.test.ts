import express from "express";
import mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler, HttpError } from "../src/http/errors.js";
import { createLogger, httpLoggerOptions } from "../src/http/logger.js";

function appThrowing(err: unknown) {
  const app = express();
  app.use(pinoHttp(httpLoggerOptions(createLogger({ level: "silent" }))));
  app.get("/", () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
}

const requestId = expect.stringMatching(/^[0-9a-f-]{36}$/);

describe("errorHandler", () => {
  it("answers an HttpError with its status, error and fields", async () => {
    const err = new HttpError(422, "Invalid application", {
      company: "Required",
    });

    const res = await request(appThrowing(err)).get("/");

    expect(res.status).toBe(422);
    expect(res.body).toEqual({
      error: "Invalid application",
      fields: { company: "Required" },
      requestId,
    });
  });

  it.each([
    [400, "Invalid request body"],
    [413, "Invalid request body"],
    [404, "Not found"],
  ])("answers an error with status %i as %s", async (status, error) => {
    const err = Object.assign(new Error("from a library"), { status });

    const res = await request(appThrowing(err)).get("/");

    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error, requestId });
  });

  it("answers a CastError with 404", async () => {
    const err = new mongoose.Error.CastError("ObjectId", "nope", "_id");

    const res = await request(appThrowing(err)).get("/");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", requestId });
  });

  it.each([
    ["a plain Error", new Error("boom")],
    [
      "an error with a 5xx status",
      Object.assign(new Error("up"), { status: 502 }),
    ],
    ["a thrown string", "boom"],
  ])("answers %s with 500", async (_name, err) => {
    const res = await request(appThrowing(err)).get("/");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Something went wrong", requestId });
  });
});
