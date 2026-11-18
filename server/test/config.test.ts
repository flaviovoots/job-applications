import path from "node:path";
import { describe, expect, it } from "vitest";
import { readConfig } from "../src/config.js";

const uri = "mongodb://127.0.0.1:27017/test-config";

describe("readConfig", () => {
  it("reads a valid environment", () => {
    expect(
      readConfig({
        MONGODB_URI: uri,
        PORT: "8080",
        RENDER_GIT_COMMIT: "abc123",
      }),
    ).toEqual({
      mongodbUri: uri,
      port: 8080,
      commit: "abc123",
      clientDir: path.resolve("client/dist"),
    });
  });

  it("defaults commit to dev and a missing PORT to 3000", () => {
    const config = readConfig({ MONGODB_URI: uri });
    expect(config.commit).toBe("dev");
    expect(config.port).toBe(3000);
  });

  it("treats an empty PORT as 3000", () => {
    expect(readConfig({ MONGODB_URI: uri, PORT: "" }).port).toBe(3000);
  });

  it("names a missing MONGODB_URI", () => {
    expect(() => readConfig({})).toThrow("MONGODB_URI is missing");
  });

  it.each(["0", "65536", "3.5", "80abc"])("rejects PORT=%s", (port) => {
    expect(() => readConfig({ MONGODB_URI: uri, PORT: port })).toThrow(
      "PORT must be a whole number from 1 to 65535",
    );
  });

  it("names every problem in one error, without any value", () => {
    const read = () =>
      readConfig({ MONGODB_URI: "", PORT: "port-secret-value" });
    expect(read).toThrow("MONGODB_URI is missing");
    expect(read).toThrow("PORT must be a whole number from 1 to 65535");
    expect(read).not.toThrow(/port-secret-value/);
  });
});
