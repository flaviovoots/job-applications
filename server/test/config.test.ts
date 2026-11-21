import path from "node:path";
import { describe, expect, it } from "vitest";
import { readConfig } from "../src/config.js";

const uri = "mongodb://127.0.0.1:27017/test-config";
const secret = "s".repeat(32);

function validEnv(): NodeJS.ProcessEnv {
  return {
    MONGODB_URI: uri,
    SESSION_SECRET: secret,
    GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
    ALLOWED_EMAILS: "alice@example.com,bob@example.com",
    APP_ORIGIN: "http://localhost:5173",
  };
}

describe("readConfig", () => {
  it("reads a valid environment", () => {
    expect(
      readConfig({ ...validEnv(), PORT: "8080", RENDER_GIT_COMMIT: "abc123" }),
    ).toEqual({
      mongodbUri: uri,
      port: 8080,
      commit: "abc123",
      clientDir: path.resolve("client/dist"),
      sessionSecret: secret,
      googleClientId: "test-client.apps.googleusercontent.com",
      allowedEmails: new Set(["alice@example.com", "bob@example.com"]),
      appOrigin: "http://localhost:5173",
    });
  });

  it("defaults commit to dev and a missing PORT to 3000", () => {
    const config = readConfig(validEnv());
    expect(config.commit).toBe("dev");
    expect(config.port).toBe(3000);
  });

  it("treats an empty PORT as 3000", () => {
    expect(readConfig({ ...validEnv(), PORT: "" }).port).toBe(3000);
  });

  it.each([
    "MONGODB_URI",
    "SESSION_SECRET",
    "GOOGLE_CLIENT_ID",
    "ALLOWED_EMAILS",
    "APP_ORIGIN",
  ])("names a missing %s", (name) => {
    expect(() => readConfig({ ...validEnv(), [name]: undefined })).toThrow(
      `${name} is missing`,
    );
  });

  it.each(["0", "65536", "3.5", "80abc"])("rejects PORT=%s", (port) => {
    expect(() => readConfig({ ...validEnv(), PORT: port })).toThrow(
      "PORT must be a whole number from 1 to 65535",
    );
  });

  it("refuses a 31-character SESSION_SECRET and accepts 32", () => {
    expect(() =>
      readConfig({ ...validEnv(), SESSION_SECRET: "s".repeat(31) }),
    ).toThrow("SESSION_SECRET must be at least 32 characters");
    expect(
      readConfig({ ...validEnv(), SESSION_SECRET: "s".repeat(32) })
        .sessionSecret,
    ).toHaveLength(32);
  });

  it("names ALLOWED_EMAILS as missing when parsing leaves no email", () => {
    expect(() => readConfig({ ...validEnv(), ALLOWED_EMAILS: " , " })).toThrow(
      "ALLOWED_EMAILS is missing",
    );
  });

  it.each([
    "http://localhost:5173/",
    "https://jobs.example.com/app",
    "localhost:5173",
    "not a url",
  ])("rejects APP_ORIGIN=%s", (origin) => {
    expect(() => readConfig({ ...validEnv(), APP_ORIGIN: origin })).toThrow(
      "APP_ORIGIN must be an origin, with no path or trailing slash",
    );
  });

  it("names every problem in one error, without any value", () => {
    const read = () =>
      readConfig({
        ...validEnv(),
        MONGODB_URI: "",
        PORT: "port-secret-value",
        SESSION_SECRET: "short-secret-value",
        APP_ORIGIN: "https://origin-secret-value.example.com/",
      });
    expect(read).toThrow("MONGODB_URI is missing");
    expect(read).toThrow("PORT must be a whole number from 1 to 65535");
    expect(read).toThrow("SESSION_SECRET must be at least 32 characters");
    expect(read).toThrow(
      "APP_ORIGIN must be an origin, with no path or trailing slash",
    );
    expect(read).not.toThrow(/secret-value/);
  });
});
