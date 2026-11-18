import { MongoClient } from "mongodb";
import mongoose from "mongoose";
import { describe, expect, inject, it } from "vitest";
import { assertTestUri, connectTestDb, disconnectTestDb } from "./helpers.js";

describe("assertTestUri", () => {
  it("accepts 127.0.0.1 with a test- database", () => {
    expect(() =>
      assertTestUri("mongodb://127.0.0.1:27017/test-abc"),
    ).not.toThrow();
  });

  it("refuses an Atlas host without printing the URI", () => {
    const password = "s3cretPass";
    const uri = `mongodb+srv://jobs-dev:${password}@jobs.example.mongodb.net/test-abc`;
    expect(() => assertTestUri(uri)).toThrow(/^Refusing to connect/);
    expect(() => assertTestUri(uri)).not.toThrow(new RegExp(password));
  });

  it("refuses localhost", () => {
    expect(() => assertTestUri("mongodb://localhost:27017/test-abc")).toThrow(
      /^Refusing to connect/,
    );
  });

  it("refuses a database name without the test- prefix", () => {
    expect(() => assertTestUri("mongodb://127.0.0.1:27017/jobs_dev")).toThrow(
      /^Refusing to connect/,
    );
  });
});

describe("connectTestDb", () => {
  it("connects to a fresh test- database and drops it on disconnect", async () => {
    await connectTestDb();
    expect(mongoose.connection.readyState).toBe(1);
    const name = mongoose.connection.name;
    expect(name).toMatch(/^test-/);
    await mongoose.connection.collection("probe").insertOne({ ok: true });

    await disconnectTestDb();
    expect(mongoose.connection.readyState).toBe(0);

    const client = await MongoClient.connect(inject("mongoUri"));
    const { databases } = await client.db().admin().listDatabases();
    await client.close();
    expect(databases.map((db) => db.name)).not.toContain(name);
  });
});
