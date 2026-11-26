// Bob must never reach Alice's data. Later stages add one case per data route.
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Application } from "../src/applications/model.js";
import {
  buildInput,
  connectTestDb,
  disconnectTestDb,
  makeTestApp,
  signIn,
} from "./helpers.js";

let app: Express;
let alice: request.Agent;
let bob: request.Agent;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(disconnectTestDb);

beforeEach(async () => {
  await Application.deleteMany({});
  ({ app } = makeTestApp());
  alice = request.agent(app);
  bob = request.agent(app);
  await signIn(alice, "alice@example.com");
  await signIn(bob, "bob@example.com");
});

describe("another account's applications", () => {
  it("leaves Alice's application out of Bob's list", async () => {
    const created = await alice.post("/api/applications").send(buildInput());
    expect(created.status).toBe(201);

    const res = await bob.get("/api/applications");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ["GET", (url: string) => bob.get(url)],
    [
      "PATCH",
      (url: string) =>
        bob.patch(url).send({ status: "interviewing", location: "Porto" }),
    ],
    ["DELETE", (url: string) => bob.delete(url)],
  ])("gives Bob 404 on %s of Alice's application", async (_method, send) => {
    const created = await alice.post("/api/applications").send(buildInput());
    const url = `/api/applications/${created.body.id}`;

    const res = await send(url);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Not found",
      requestId: expect.any(String),
    });
    const after = await alice.get(url);
    expect(after.body).toEqual(created.body);
  });
});
