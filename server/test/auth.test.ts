import mongoose from "mongoose";
import request from "supertest";
import type { Express } from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Config } from "../src/config.js";
import { createLogger } from "../src/http/logger.js";
import {
  captureStream,
  connectTestDb,
  disconnectTestDb,
  makeTestApp,
  readSession,
  signIn,
} from "./helpers.js";

let app: Express;
let config: Config;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(disconnectTestDb);

beforeEach(async () => {
  await sessions().deleteMany({});
  ({ app, config } = makeTestApp());
});

const appOrigin = "http://localhost:5173";
const requestId = expect.stringMatching(/^[0-9a-f-]{36}$/);

function sessions() {
  return mongoose.connection.getClient().db().collection("sessions");
}

function sidCookie(res: request.Response): string | undefined {
  return res.get("Set-Cookie")?.find((cookie) => cookie.startsWith("sid="));
}

describe("POST /auth/google", () => {
  it("signs in an allowed account with an HttpOnly, Lax sid cookie", async () => {
    const agent = request.agent(app);

    const res = await signIn(agent, "alice@example.com");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: "alice@example.com" });
    const cookie = sidCookie(res);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Secure");
  });

  it("marks the cookie Secure when X-Forwarded-Proto: https arrives", async () => {
    const agent = request.agent(app).set("X-Forwarded-Proto", "https");

    const res = await signIn(agent, "alice@example.com");

    expect(res.status).toBe(200);
    expect(sidCookie(res)).toContain("Secure");
  });

  it("stores the token's sub as userId, with the email", async () => {
    const agent = request.agent(app);

    await signIn(agent, "alice@example.com");

    expect(await readSession(agent)).toMatchObject({
      userId: "sub-alice@example.com",
      email: "alice@example.com",
    });
  });

  it("gives a new sid when the same agent signs in again", async () => {
    const agent = request.agent(app);

    const first = sidCookie(await signIn(agent, "alice@example.com"));
    const second = sidCookie(await signIn(agent, "alice@example.com"));

    expect(first).toMatch(/^sid=s%3A/);
    expect(second).toMatch(/^sid=s%3A/);
    expect(second?.split(";")[0]).not.toBe(first?.split(";")[0]);
  });

  it.each([
    {
      name: "a missing credential",
      body: {},
      status: 400,
      error: "Missing credential",
    },
    {
      name: "a bad token",
      body: { credential: "not-a-token" },
      status: 401,
      error: "Invalid sign-in token",
    },
    {
      name: "an unverified email",
      body: { credential: "unverified:alice@example.com" },
      status: 403,
      error: "Not allowed",
    },
    {
      name: "an unlisted account",
      body: { credential: "valid:carol@example.com" },
      status: 403,
      error: "Not allowed",
    },
  ])(
    "refuses $name with $status, no cookie and no session",
    async ({ body, status, error }) => {
      const res = await request(app)
        .post("/auth/google")
        .set("Origin", appOrigin)
        .send(body);

      expect(res.status).toBe(status);
      expect(res.body).toEqual({ error, requestId });
      expect(res.get("Set-Cookie")).toBeUndefined();
      expect(await sessions().countDocuments()).toBe(0);
    },
  );
});

describe("GET /api/me and POST /auth/logout", () => {
  it("gives the email after sign-in", async () => {
    const agent = request.agent(app);
    await signIn(agent, "alice@example.com");

    const res = await agent.get("/api/me");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ email: "alice@example.com" });
  });

  it("gives 401 with no session, and sets no cookie", async () => {
    const res = await request(app).get("/api/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in", requestId });
    expect(res.get("Set-Cookie")).toBeUndefined();
  });

  it("signs out: 204, sid cleared, then 401", async () => {
    const agent = request.agent(app);
    await signIn(agent, "alice@example.com");

    const res = await agent.post("/auth/logout").send({});

    expect(res.status).toBe(204);
    expect(sidCookie(res)).toMatch(/^sid=;.*Expires=Thu, 01 Jan 1970/);
    expect(await sessions().countDocuments()).toBe(0);
    expect((await agent.get("/api/me")).status).toBe(401);
  });

  it("ends the session once the email leaves the allowlist", async () => {
    const agent = request.agent(app);
    await signIn(agent, "alice@example.com");

    config.allowedEmails.delete("alice@example.com");
    const res = await agent.get("/api/me");

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Not signed in", requestId });
    expect(await readSession(agent)).toBeNull();
  });
});

describe("sign-in logs", () => {
  let lines: string[];

  beforeEach(() => {
    const capture = captureStream();
    lines = capture.lines;
    ({ app } = makeTestApp({
      logger: createLogger({ destination: capture.stream }),
    }));
  });

  function entries(): unknown[] {
    return lines.map((line) => JSON.parse(line));
  }

  it("logs auth.signin, with no email in any line", async () => {
    await signIn(request.agent(app), "alice@example.com");

    expect(entries()).toContainEqual(
      expect.objectContaining({ msg: "auth.signin" }),
    );
    expect(lines.join("")).not.toContain("@example.com");
  });

  it.each([
    { credential: "unverified:alice@example.com", reason: "email_unverified" },
    { credential: "valid:carol@example.com", reason: "not_allowed" },
  ])(
    "logs auth.refused with reason $reason, with no email in any line",
    async ({ credential, reason }) => {
      await request(app)
        .post("/auth/google")
        .set("Origin", appOrigin)
        .send({ credential });

      expect(entries()).toContainEqual(
        expect.objectContaining({ msg: "auth.refused", reason }),
      );
      expect(lines.join("")).not.toContain("@example.com");
    },
  );
});
