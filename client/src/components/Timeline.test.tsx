import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StatusHistoryEntry } from "../../../shared/api.js";
import Timeline from "./Timeline";

// Out of order, as the data may hold it. 04:30 UTC on the 15th is 23:30 on
// the 14th in New York.
const history: StatusHistoryEntry[] = [
  { status: "interviewing", changedAt: "2026-11-20T15:00:00.000Z" },
  { status: "saved", changedAt: "2026-11-10T14:00:00.000Z" },
  { status: "applied", changedAt: "2026-11-15T04:30:00.000Z" },
];

describe("Timeline", () => {
  it("lists each entry's label and local time, oldest first", () => {
    render(<Timeline history={history} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Timeline" }),
    ).toBeTruthy();
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual([
      "Saved Nov 10, 2026, 9:00 AM",
      "Applied Nov 14, 2026, 11:30 PM",
      "Interviewing Nov 20, 2026, 10:00 AM",
    ]);
  });

  it("sorts a copy, leaving the given history in its order", () => {
    render(<Timeline history={history} />);

    expect(history.map((entry) => entry.status)).toEqual([
      "interviewing",
      "saved",
      "applied",
    ]);
  });
});
