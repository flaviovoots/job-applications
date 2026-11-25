import { afterEach, describe, expect, it, vi } from "vitest";
import { displayDay, todayLocal } from "./dates";

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
