import { describe, expect, it } from "vitest";
import { nextAppliedDate } from "./appliedDateRule";

const today = "2026-11-14";

describe("nextAppliedDate", () => {
  it("fills in today on a change to applied with an empty date", () => {
    expect(nextAppliedDate("applied", "", today)).toBe(today);
  });

  it("keeps a date already set on a change to applied", () => {
    expect(nextAppliedDate("applied", "2026-11-01", today)).toBe("2026-11-01");
  });

  it("leaves an empty date empty on a change to another status", () => {
    expect(nextAppliedDate("interviewing", "", today)).toBe("");
  });

  it("keeps the date on a change from applied back to saved", () => {
    expect(nextAppliedDate("saved", "2026-11-14", today)).toBe("2026-11-14");
  });
});
