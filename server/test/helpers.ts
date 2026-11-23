import { randomUUID } from "node:crypto";
import { Writable } from "node:stream";
import type { SessionData } from "express-session";
import mongoose from "mongoose";
import type request from "supertest";
import { inject } from "vitest";
import { fileURLToPath } from "node:url";
import type { Logger } from "pino";
import { createApp } from "../src/app.js";
import type { VerifyIdToken } from "../src/auth/googleVerifier.js";
import type { Config } from "../src/config.js";
import { HttpError } from "../src/http/errors.js";
import { createLogger } from "../src/http/logger.js";

export function assertTestUri(uri: string): void {
  let host = "";
  let dbName = "";
  try {
    const url = new URL(uri);
    host = url.hostname;
    dbName = url.pathname.slice(1);
  } catch {
    // An unparsable URI is refused below.
  }
  if (host !== "127.0.0.1" || !dbName.startsWith("test-")) {
    throw new Error(
      "Refusing to connect: tests may only use 127.0.0.1 and a database named test-*",
    );
  }
}

export async function connectTestDb(): Promise<string> {
  const url = new URL(inject("mongoUri"));
  url.pathname = `/test-${randomUUID()}`;
  const uri = url.toString();
  assertTestUri(uri);
  await mongoose.connect(uri);
  return uri;
}

export async function disconnectTestDb(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export function testConfig(): Config {
  return {
    mongodbUri: "mongodb://127.0.0.1:27017/test-unused",
    port: 0,
    commit: "test-commit",
    clientDir: fileURLToPath(new URL("./fixtures/client", import.meta.url)),
    sessionSecret: "s".repeat(32),
    googleClientId: "test-client.apps.googleusercontent.com",
    allowedEmails: new Set(["alice@example.com", "bob@example.com"]),
    appOrigin: "http://localhost:5173",
  };
}

// "valid:<email>" and "unverified:<email>" stand in for Google ID tokens.
export const fakeVerifier: VerifyIdToken = async (idToken) => {
  const match = /^(valid|unverified):(.+)$/.exec(idToken);
  if (!match) {
    throw new HttpError(401, "Invalid sign-in token");
  }
  const [, kind, email] = match;
  return { sub: `sub-${email}`, email, emailVerified: kind === "valid" };
};

// Call after connectTestDb(): the session store uses the connected client.
export function makeTestApp({ logger }: { logger?: Logger } = {}) {
  const config = testConfig();
  const app = createApp({
    config,
    logger: logger ?? createLogger({ level: "silent" }),
    verifyIdToken: fakeVerifier,
  });
  return { app, config };
}

// A log destination that keeps each line, for createLogger({ destination }).
export function captureStream() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, stream };
}

// Makes the agent send the test Origin on every later request, then signs in.
export function signIn(agent: request.Agent, email: string) {
  agent.set("Origin", testConfig().appOrigin);
  return agent.post("/auth/google").send({ credential: `valid:${email}` });
}

// The sid cookie holds "s:<id>.<signature>", URL-encoded, and connect-mongo
// stores the session as a JSON string.
export async function readSession(
  agent: request.Agent,
): Promise<SessionData | null> {
  const cookie = agent.jar.getCookie("sid", {
    domain: "127.0.0.1",
    path: "/",
    secure: true,
    script: false,
  });
  if (!cookie) {
    return null;
  }
  const value = decodeURIComponent(cookie.value);
  const id = value.slice("s:".length, value.lastIndexOf("."));
  const stored = await mongoose.connection
    .getClient()
    .db()
    .collection<{ _id: string; session: string }>("sessions")
    .findOne({ _id: id });
  return stored ? JSON.parse(stored.session) : null;
}
