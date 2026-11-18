import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { inject } from "vitest";
import { fileURLToPath } from "node:url";
import type { Config } from "../src/config.js";

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
  };
}
