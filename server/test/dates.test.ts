import { describe, expect, it } from "vitest";
import { MESSAGES } from "../../shared/fields.js";
import { formatDay, parseDay } from "../src/lib/dates.js";

// 23:30 in New York on 2026-11-14 is already 2026-11-15 in UTC.
const lateEvening = new Date("2026-11-14T23:30:00-05:00");

describe("parseDay", () => {
  it("gives UTC midnight for a valid date", () => {
    expect(parseDay("2026-11-14", lateEvening)).toEqual(
      new Date(Date.UTC(2026, 10, 14)),
    );
  });

  it("refuses impossible dates and other formats", () => {
    expect(parseDay("2026-02-30", lateEvening)).toBe(MESSAGES.badDate);
    expect(parseDay("2026-2-3", lateEvening)).toBe(MESSAGES.badDate);
    expect(parseDay("", lateEvening)).toBe(MESSAGES.badDate);
  });

  // Using the local date instead of UTC would refuse 2026-11-16 here.
  it("accepts tomorrow in UTC and refuses the day after", () => {
    expect(parseDay("2026-11-16", lateEvening)).toEqual(
      new Date(Date.UTC(2026, 10, 16)),
    );
    expect(parseDay("2026-11-17", lateEvening)).toBe(MESSAGES.futureDate);
  });
});

describe("formatDay", () => {
  it("formats in UTC, not in the local zone", () => {
    // Local midnight in New York is still the 13th.
    expect(formatDay(new Date(Date.UTC(2026, 10, 14)))).toBe("2026-11-14");
  });
});
