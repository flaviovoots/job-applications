import { afterEach, describe, expect, it, vi } from "vitest";
import { displayDay, formatTime, todayLocal } from "./dates";

afterEach(() => {
  vi.useRealTimers();
});

describe("todayLocal", () => {
  // 23:30 in New York on 2026-11-14 is already 2026-11-15 in UTC.
  it("gives the local calendar date, not the UTC one", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T23:30:00-05:00"));
    expect(todayLocal()).toBe("2026-11-14");
  });
});

describe("displayDay", () => {
  // Local midnight in New York would still be the 13th.
  it("shows the calendar date without shifting the day", () => {
    expect(displayDay("2026-11-14")).toBe("Nov 14, 2026");
  });
});

describe("formatTime", () => {
  // 04:30 UTC on the 15th is 23:30 on the 14th in New York.
  it("shows an ISO instant in the local zone", () => {
    expect(formatTime("2026-11-15T04:30:00.000Z")).toBe(
      "Nov 14, 2026, 11:30 PM",
    );
  });
});
