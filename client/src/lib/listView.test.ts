import { describe, expect, it } from "vitest";
import { buildSummary } from "../test/responses";
import { sortApplications } from "./listView";

const ids = (list: { id: string }[]) => list.map((row) => row.id);

describe("sortApplications", () => {
  it("puts rows with no applied date first, then newest applied first", () => {
    const list = [
      buildSummary({ id: "older", appliedDate: "2026-10-01" }),
      buildSummary({ id: "none", appliedDate: null }),
      buildSummary({ id: "newer", appliedDate: "2026-11-10" }),
    ];
    expect(ids(sortApplications(list))).toEqual(["none", "newer", "older"]);
  });

  it("breaks a tie between empty dates by created date, newest first", () => {
    const list = [
      buildSummary({ id: "a", createdAt: "2026-11-01T10:00:00.000Z" }),
      buildSummary({ id: "b", createdAt: "2026-11-03T10:00:00.000Z" }),
    ];
    expect(ids(sortApplications(list))).toEqual(["b", "a"]);
  });

  it("breaks a tie between equal dates by created date, newest first", () => {
    const list = [
      buildSummary({
        id: "a",
        appliedDate: "2026-11-10",
        createdAt: "2026-11-10T08:00:00.000Z",
      }),
      buildSummary({
        id: "b",
        appliedDate: "2026-11-10",
        createdAt: "2026-11-10T09:00:00.000Z",
      }),
    ];
    expect(ids(sortApplications(list))).toEqual(["b", "a"]);
  });

  it("returns a new array and leaves the input alone", () => {
    const list = [
      buildSummary({ id: "older", appliedDate: "2026-10-01" }),
      buildSummary({ id: "newer", appliedDate: "2026-11-10" }),
    ];
    const sorted = sortApplications(list);
    expect(sorted).not.toBe(list);
    expect(ids(list)).toEqual(["older", "newer"]);
  });
});
