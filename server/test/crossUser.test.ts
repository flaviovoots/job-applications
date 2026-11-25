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
});
