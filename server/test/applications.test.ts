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
