import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { connectTestDb, disconnectTestDb, makeTestApp } from "./helpers.js";

const requestIdPattern = /^[0-9a-f-]{36}$/;

// The session store creates its TTL index in the background. A disconnect
// that cuts it off leaves a rejection nothing waits on, which Vitest reports
// as an unhandled error, so wait for the index first.
async function sessionIndexReady(): Promise<void> {
  await vi.waitFor(async () => {
    const sessions = mongoose.connection.db!.collection("sessions");
    expect(await sessions.indexExists("expires_1")).toBe(true);
  });
}

describe("GET /healthz", () => {
  it("gives 200 with db up while connected", async () => {
    await connectTestDb();
    onTestFinished(disconnectTestDb);
    const { app } = makeTestApp();
    await sessionIndexReady();

    const res = await request(app).get("/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", db: "up", commit: "test-commit" });
    expect(res.headers["x-request-id"]).toMatch(requestIdPattern);
  });

  it("gives 503 degraded after disconnecting", async () => {
    await connectTestDb();
    const { app } = makeTestApp();
    await sessionIndexReady();
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
