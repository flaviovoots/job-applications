import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../test/render";
import { buildSummary, jsonResponse } from "../test/responses";
import ListPage from "./ListPage";

const unsorted = [
  buildSummary({
    id: "older",
    company: "Globex",
    role: "Designer",
    status: "applied",
    appliedDate: "2026-10-01",
  }),
  buildSummary({ id: "none", company: "Acme", role: "Engineer" }),
  buildSummary({
    id: "newer",
    company: "Initech",
    role: "Analyst",
    status: "no_response",
    appliedDate: "2026-11-10",
    location: "Lisbon",
    workMode: "onsite",
  }),
];

// The table's body rows, without the header row.
function bodyRows() {
  return screen.getAllByRole<HTMLTableRowElement>("row").slice(1);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ListPage", () => {
  it("shows the heading and a link to the create form", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(200, []));

    renderWithProviders(<ListPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Applications" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "New application" })
        .getAttribute("href"),
    ).toBe("/applications/new");
    await screen.findByText(/No job applications yet/);
  });

  it("shows the rows in the default order with their labels", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(200, unsorted),
    );

    renderWithProviders(<ListPage />);

    await screen.findByText("Acme");
    const rows = bodyRows();
    expect(rows.map((row) => row.cells[0].textContent)).toEqual([
      "Acme",
      "Initech",
      "Globex",
    ]);
    expect(within(rows[0]).getByText("Engineer")).toBeTruthy();
    expect(within(rows[0]).getByText("Saved")).toBeTruthy();
    expect(within(rows[1]).getByText("No response")).toBeTruthy();
    expect(within(rows[1]).getByText("Lisbon")).toBeTruthy();
    expect(within(rows[1]).getByText("Nov 10, 2026")).toBeTruthy();
    expect(within(rows[1]).getByText("On-site")).toBeTruthy();
  });

  // The link's hit area stretches over the row in CSS, which jsdom doesn't
  // lay out; S4a.1 checks that in a browser.
  it("gives each row one link, in the company cell, to its detail page", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse(200, unsorted),
    );

    renderWithProviders(<ListPage />);

    await screen.findByText("Acme");
    for (const row of bodyRows()) {
      const links = within(row).getAllByRole("link");
      expect(links).toHaveLength(1);
      expect(row.cells[0].contains(links[0])).toBe(true);
      expect(links[0].textContent).toBe(row.cells[0].textContent);
    }
    expect(
      bodyRows().map((row) =>
        within(row).getByRole("link").getAttribute("href"),
      ),
    ).toEqual([
      "/applications/none",
      "/applications/newer",
      "/applications/older",
    ]);
  });

  it("shows the empty state when there are no applications", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(jsonResponse(200, []));

    renderWithProviders(<ListPage />);

    expect(
      await screen.findByText(
        "No job applications yet. Add one to get started.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows Loading… while the list loads", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(new Promise(() => {}));

    renderWithProviders(<ListPage />);

    expect(screen.getByText("Loading…")).toBeTruthy();
  });

  it("shows the error and loads again on Try again", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        jsonResponse(500, { error: "Something went wrong", requestId: "r" }),
      )
      .mockResolvedValueOnce(jsonResponse(200, unsorted));

    renderWithProviders(<ListPage />);

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Something went wrong",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Acme")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
