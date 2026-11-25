import { describe, expect, it } from "vitest";
import { MESSAGES } from "../../shared/fields.js";
import { normalizeInput } from "../src/applications/input.js";
import { HttpError } from "../src/http/errors.js";

function refusal(body: unknown, partial = false): HttpError {
  try {
    normalizeInput(body, { partial });
  } catch (err) {
    if (err instanceof HttpError) return err;
    throw err;
  }
  throw new Error("normalizeInput accepted the body");
}

const valid = { company: "Acme", role: "Engineer" };

describe("normalizeInput", () => {
  it("refuses a body that isn't a plain object, with no fields", () => {
    for (const body of [["Acme"], "Acme", null]) {
      const err = refusal(body);
      expect(err.status).toBe(400);
      expect(err.error).toBe("Invalid request body");
      expect(err.fields).toBeUndefined();
    }
  });

  it("refuses unknown and server-only keys", () => {
    const err = refusal({ ...valid, userId: "sub-x", notes: [] });
    expect(err.status).toBe(400);
    expect(err.error).toBe(MESSAGES.checkFields);
    expect(err.fields).toEqual({
      userId: MESSAGES.notAllowed,
      notes: MESSAGES.notAllowed,
    });
  });

  it("refuses a value that isn't a string or null", () => {
    expect(refusal({ company: 5, role: ["x"], location: {} }).fields).toEqual({
      company: MESSAGES.notText,
      role: MESSAGES.notText,
      location: MESSAGES.notText,
    });
  });

  it("trims strings", () => {
    expect(
      normalizeInput(
        { company: " Acme ", role: "\tEngineer\n" },
        { partial: false },
      ),
    ).toEqual(valid);
  });

  it("turns an empty or null optional field into null", () => {
    expect(
      normalizeInput(
        { ...valid, location: "  ", salaryRange: null, appliedDate: "" },
        { partial: false },
      ),
    ).toEqual({
      ...valid,
      location: null,
      salaryRange: null,
      appliedDate: null,
    });
  });

  it("requires company and role on create", () => {
    expect(refusal({}).fields).toEqual({
      company: MESSAGES.required,
      role: MESSAGES.required,
    });
    expect(refusal({ company: " ", role: null }).fields).toEqual({
      company: MESSAGES.required,
      role: MESSAGES.required,
    });
  });

  it("checks only the fields sent on a partial update", () => {
    expect(normalizeInput({}, { partial: true })).toEqual({});
    expect(normalizeInput({ location: "Lisbon" }, { partial: true })).toEqual({
      location: "Lisbon",
    });
    expect(refusal({ company: "" }, true).fields).toEqual({
      company: MESSAGES.required,
    });
  });

  it("refuses an emptied status, which keeps its default only when absent", () => {
    expect(refusal({ status: null }, true).fields).toEqual({
      status: MESSAGES.required,
    });
    expect(normalizeInput(valid, { partial: false })).not.toHaveProperty(
      "status",
    );
  });

  it("cleans the job description's bullets, then trims it", () => {
    expect(
      normalizeInput(
        { ...valid, jobDescription: " Duties: •one •two " },
        { partial: false },
      ),
    ).toEqual({ ...valid, jobDescription: "Duties:\n•one\n•two" });
  });

  it("turns appliedDate into a Date, or names the bad date", () => {
    expect(
      normalizeInput(
        { ...valid, appliedDate: "2026-11-14" },
        { partial: false },
      ),
    ).toEqual({ ...valid, appliedDate: new Date(Date.UTC(2026, 10, 14)) });
    expect(refusal({ ...valid, appliedDate: "2026-02-30" }).fields).toEqual({
      appliedDate: MESSAGES.badDate,
    });
  });
});
