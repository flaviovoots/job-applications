import type { Express } from "express";
import mongoose from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Application } from "../src/applications/model.js";
import {
  buildInput,
  connectTestDb,
  disconnectTestDb,
  makeTestApp,
  signIn,
} from "./helpers.js";

let app: Express;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(disconnectTestDb);

beforeEach(async () => {
  await Application.deleteMany({});
  ({ app } = makeTestApp());
});

const SUMMARY_KEYS = [
  "id",
  "company",
  "role",
  "status",
  "appliedDate",
  "location",
  "workMode",
  "salaryRange",
  "nextStep",
  "createdAt",
].sort();

const DETAIL_KEYS = [
  ...SUMMARY_KEYS,
  "jobUrl",
  "jobDescription",
  "coverLetter",
  "statusHistory",
  "deletedAt",
  "updatedAt",
].sort();

const requestId = expect.stringMatching(/^[0-9a-f-]{36}$/);
const isoDate = expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);

async function signedInAgent(email = "alice@example.com") {
  const agent = request.agent(app);
  await signIn(agent, email);
  return agent;
}

describe("POST /api/applications", () => {
  it("creates one with company and role only", async () => {
    const agent = await signedInAgent();

    const res = await agent
      .post("/api/applications")
      .send({ company: "Acme", role: "Engineer" });

    expect(res.status).toBe(201);
    expect(Object.keys(res.body).sort()).toEqual(DETAIL_KEYS);
    expect(res.body).toMatchObject({
      company: "Acme",
      role: "Engineer",
      status: "saved",
      statusHistory: [{ status: "saved", changedAt: isoDate }],
      appliedDate: null,
      deletedAt: null,
    });
    expect(Object.keys(res.body.statusHistory[0]).sort()).toEqual([
      "changedAt",
      "status",
    ]);
  });

  it("round-trips every field, with appliedDate as YYYY-MM-DD", async () => {
    const agent = await signedInAgent();
    const input = buildInput();

    const res = await agent.post("/api/applications").send(input);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject(input);
    expect(res.body.appliedDate).toBe("2026-11-10");
  });

  it("starts the history with the status it was created with", async () => {
    const agent = await signedInAgent();

    const res = await agent
      .post("/api/applications")
      .send(buildInput({ status: "applied" }));

    expect(res.body.statusHistory).toEqual([
      { status: "applied", changedAt: isoDate },
    ]);
  });

  it.each([
    ["no company", { company: undefined }, "company", "Required"],
    [
      "a 151-character role",
      { role: "r".repeat(151) },
      "role",
      "At most 150 characters",
    ],
    [
      "a javascript: URL",
      { jobUrl: "javascript:alert(1)" },
      "jobUrl",
      "Must start with http:// or https://",
    ],
    [
      "an unknown work mode",
      { workMode: "office" },
      "workMode",
      "Not a valid option",
    ],
    ["an unknown status", { status: "done" }, "status", "Not a valid option"],
    [
      "a future date",
      { appliedDate: "2999-01-01" },
      "appliedDate",
      "Can't be in the future",
    ],
    [
      "a description that cleanup pushes past the limit",
      { jobDescription: "ab•".repeat(3000) },
      "jobDescription",
      "At most 10,000 characters",
    ],
    [
      "a posted userId",
      { userId: "sub-bob@example.com" },
      "userId",
      "Not allowed",
    ],
  ])("refuses %s", async (_name, overrides, field, message) => {
    const agent = await signedInAgent();

    const res = await agent
      .post("/api/applications")
      .send({ ...buildInput(), ...overrides });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Check the fields",
      fields: { [field]: message },
      requestId,
    });
    expect(await Application.countDocuments()).toBe(0);
  });
});

describe("GET /api/applications", () => {
  it("lists active rows with exactly the summary keys", async () => {
    const agent = await signedInAgent();
    await agent.post("/api/applications").send(buildInput({ company: "Kept" }));
    const trashed = await agent
      .post("/api/applications")
      .send(buildInput({ company: "Trashed" }));
    await Application.updateOne(
      { _id: trashed.body.id },
      { deletedAt: new Date() },
    );

    const res = await agent.get("/api/applications");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].company).toBe("Kept");
    expect(Object.keys(res.body[0]).sort()).toEqual(SUMMARY_KEYS);
  });
});

describe("GET /api/applications/:id", () => {
  it("gives one with exactly the detail keys", async () => {
    const agent = await signedInAgent();
    const created = await agent.post("/api/applications").send(buildInput());

    const res = await agent.get(`/api/applications/${created.body.id}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(DETAIL_KEYS);
    expect(res.body).toEqual(created.body);
    expect(res.body.deletedAt).toBeNull();
  });

  it.each([
    ["an id that matches nothing", String(new mongoose.Types.ObjectId())],
    ["a malformed id", "nope"],
  ])("gives 404 for %s", async (_name, id) => {
    const agent = await signedInAgent();

    const res = await agent.get(`/api/applications/${id}`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", requestId });
  });
});

describe("PATCH /api/applications/:id without a status", () => {
  async function createOne() {
    const agent = await signedInAgent();
    const created = await agent
      .post("/api/applications")
      .send(buildInput({ location: "Porto" }));
    return { agent, created: created.body };
  }

  it("changes one field and keeps the rest and the history", async () => {
    const { agent, created } = await createOne();

    const res = await agent
      .patch(`/api/applications/${created.id}`)
      .send({ location: "Lisbon" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...created,
      location: "Lisbon",
      updatedAt: isoDate,
    });
  });

  it("clears a field sent as null", async () => {
    const { agent, created } = await createOne();

    const res = await agent
      .patch(`/api/applications/${created.id}`)
      .send({ location: null });

    expect(res.status).toBe(200);
    expect(res.body.location).toBeNull();
  });

  it("gives the document unchanged for an empty body", async () => {
    const { agent, created } = await createOne();

    const res = await agent.patch(`/api/applications/${created.id}`).send({});

    expect(res.status).toBe(200);
    expect(res.body).toEqual(created);
  });

  it.each([
    ["a null company", { company: null }, "company", "Required"],
    ["a number for company", { company: 5 }, "company", "Must be text"],
    [
      "a 151-character role",
      { role: "r".repeat(151) },
      "role",
      "At most 150 characters",
    ],
  ])("refuses %s", async (_name, body, field, message) => {
    const { agent, created } = await createOne();

    const res = await agent.patch(`/api/applications/${created.id}`).send(body);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Check the fields",
      fields: { [field]: message },
      requestId,
    });
    const after = await agent.get(`/api/applications/${created.id}`);
    expect(after.body).toEqual(created);
  });

  it.each([
    ["an id that matches nothing", String(new mongoose.Types.ObjectId())],
    ["a malformed id", "nope"],
  ])("gives 404 for %s", async (_name, id) => {
    const agent = await signedInAgent();

    const res = await agent
      .patch(`/api/applications/${id}`)
      .send({ location: "Lisbon" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", requestId });
  });
});

describe("PATCH /api/applications/:id with a status", () => {
  const CREATED_AT = "2026-11-14T15:30:00.000Z";
  const CHANGED_AT = "2026-11-15T09:00:00.000Z";
  const savedEntry = { status: "saved", changedAt: CREATED_AT };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(CREATED_AT));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // A Saved application created at CREATED_AT; the clock then moves on.
  async function createSaved() {
    const agent = await signedInAgent();
    const created = await agent
      .post("/api/applications")
      .send(buildInput({ status: "saved", location: "Lisbon" }));
    vi.setSystemTime(new Date(CHANGED_AT));
    return { agent, url: `/api/applications/${created.body.id}` };
  }

  it("appends one entry with the time of the change", async () => {
    const { agent, url } = await createSaved();

    const res = await agent.patch(url).send({ status: "applied" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("applied");
    expect(res.body.statusHistory).toEqual([
      savedEntry,
      { status: "applied", changedAt: CHANGED_AT },
    ]);
  });

  it("adds no entry when the same status is sent again", async () => {
    const { agent, url } = await createSaved();
    await agent.patch(url).send({ status: "applied" });

    const res = await agent.patch(url).send({ status: "applied" });

    expect(res.status).toBe(200);
    expect(res.body.statusHistory).toHaveLength(2);
  });

  it("adds one entry for two identical changes sent at once", async () => {
    const { agent, url } = await createSaved();

    const results = await Promise.all([
      agent.patch(url).send({ status: "interviewing" }),
      agent.patch(url).send({ status: "interviewing" }),
    ]);

    expect(results.map((r) => r.status)).toEqual([200, 200]);
    const after = await agent.get(url);
    expect(after.body.statusHistory).toEqual([
      savedEntry,
      { status: "interviewing", changedAt: CHANGED_AT },
    ]);
  });

  it("changes the other fields when the status is the current one", async () => {
    const { agent, url } = await createSaved();

    const res = await agent
      .patch(url)
      .send({ status: "saved", location: "Porto" });

    expect(res.status).toBe(200);
    expect(res.body.location).toBe("Porto");
    expect(res.body.statusHistory).toEqual([savedEntry]);
  });

  it("refuses an unknown status and leaves the document as it was", async () => {
    const { agent, url } = await createSaved();

    const res = await agent.patch(url).send({ status: "done" });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Check the fields",
      fields: { status: "Not a valid option" },
      requestId,
    });
    const after = await agent.get(url);
    expect(after.body.status).toBe("saved");
    expect(after.body.statusHistory).toEqual([savedEntry]);
  });
});

describe("DELETE /api/applications/:id", () => {
  it("moves one to Trash and keeps its history", async () => {
    const agent = await signedInAgent();
    const created = await agent.post("/api/applications").send(buildInput());
    const url = `/api/applications/${created.body.id}`;

    const res = await agent.delete(url);

    expect(res.status).toBe(204);
    expect(res.text).toBe("");
    expect((await agent.get(url)).status).toBe(404);
    expect((await agent.get("/api/applications")).body).toEqual([]);
    const stored = JSON.parse(
      JSON.stringify(await Application.findById(created.body.id)),
    );
    expect(stored.deletedAt).toEqual(isoDate);
    expect(stored.statusHistory).toEqual(created.body.statusHistory);
  });

  it("gives 404 for one already in Trash", async () => {
    const agent = await signedInAgent();
    const created = await agent.post("/api/applications").send(buildInput());
    const url = `/api/applications/${created.body.id}`;
    await agent.delete(url);

    const res = await agent.delete(url);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", requestId });
  });

  it("gives 404 for a malformed id", async () => {
    const agent = await signedInAgent();

    const res = await agent.delete("/api/applications/nope");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found", requestId });
  });
});
