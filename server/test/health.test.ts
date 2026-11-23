import request from "supertest";
import { describe, expect, it, onTestFinished } from "vitest";
import { connectTestDb, disconnectTestDb, makeTestApp } from "./helpers.js";

const requestIdPattern = /^[0-9a-f-]{36}$/;

describe("GET /healthz", () => {
  it("gives 200 with db up while connected", async () => {
    await connectTestDb();
    onTestFinished(disconnectTestDb);
    const { app } = makeTestApp();

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up", commit: "test-commit" });
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
  });

  it("gives 503 degraded after disconnecting", async () => {
    await connectTestDb();
    const { app } = makeTestApp();
    await disconnectTestDb();

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      status: "degraded",
      db: "down",
      commit: "test-commit",
    });
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
  });
});
