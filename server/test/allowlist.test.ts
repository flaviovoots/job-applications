import { describe, expect, it } from "vitest";
import { isAllowed, parseAllowlist } from "../src/auth/allowlist.js";

describe("parseAllowlist", () => {
  it("trims, lowercases and drops blank entries", () => {
    expect(parseAllowlist(" Carol@Example.com,, ,flavio@example.com ")).toEqual(
      new Set(["carol@example.com", "flavio@example.com"]),
    );
  });

  it("gives an empty set when no email is left", () => {
    expect(parseAllowlist("")).toEqual(new Set());
    expect(parseAllowlist(" , ")).toEqual(new Set());
  });
});

describe("isAllowed", () => {
  const allowlist = parseAllowlist("carol@example.com");

  it("ignores case in the email", () => {
    expect(isAllowed(allowlist, "CAROL@example.com")).toBe(true);
  });

  it("refuses an email not on the list", () => {
    expect(isAllowed(allowlist, "mari@example.com")).toBe(false);
  });
});
