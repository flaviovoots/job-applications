import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { queryClient } from "../queryClient";
import { renderWithProviders } from "../test/render";
import { buildDetail, jsonResponse } from "../test/responses";

const email = "alice@example.com";

const application = buildDetail({
  status: "applied",
  appliedDate: "2026-11-10",
  jobUrl: "https://example.com/job",
  salaryRange: "€50k",
  workMode: "remote",
  nextStep: "Call on Tuesday",
  jobDescription: "Skills:\n• A\n• B",
  statusHistory: [
    { status: "saved", changedAt: "2026-11-01T12:00:00.000Z" },
    { status: "applied", changedAt: "2026-11-15T04:30:00.000Z" },
  ],
});

// Each term with the text of the definition after it, in page order.
function definitions() {
  return [...document.querySelectorAll("dt")].map((dt) => [
    dt.textContent,
    dt.nextElementSibling?.textContent,
  ]);
}

function definitionOf(term: string) {
  return screen.getByText(term, { selector: "dt" }).nextElementSibling!;
}

function trashButton() {
  return screen.getByRole("button", { name: "Move to Trash" });
}

// GET /api/me answers 200, then the detail's answer. Each test queues the
// answers after those.
async function renderDetail(detail: Response) {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(jsonResponse(200, { email }))
    .mockResolvedValueOnce(detail);
  renderWithProviders(<App />, { url: "/applications/app-1" });
  return fetchSpy;
}

async function renderLoaded() {
  const fetchSpy = await renderDetail(jsonResponse(200, application));
  await screen.findByRole("heading", { level: 1, name: "Acme" });
  return fetchSpy;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DetailPage", () => {
  it("shows the fields, with Not set for an empty one, and the timeline", async () => {
    const fetchSpy = await renderLoaded();

    expect(fetchSpy.mock.calls[1][0]).toBe("/api/applications/app-1");
    expect(screen.getByText("Engineer", { selector: "p" })).toBeTruthy();
    expect(definitions()).toEqual([
      ["Status", "Applied"],
      ["Applied date", "Nov 10, 2026"],
      ["Job URL", "https://example.com/job"],
      ["Location", "Not set"],
      ["Salary range", "€50k"],
      ["Work mode", "Remote"],
      ["Next step", "Call on Tuesday"],
      ["Job description", "Skills:\n• A\n• B"],
      ["Cover letter", "Not set"],
    ]);
    expect(definitionOf("Job description").className).toContain(
      "whitespace-pre-wrap",
    );
    expect(definitionOf("Cover letter").className).toContain(
      "whitespace-pre-wrap",
    );

    const jobLink = screen.getByRole("link", {
      name: "https://example.com/job",
    });
    expect(jobLink.getAttribute("href")).toBe("https://example.com/job");
    expect(jobLink.getAttribute("target")).toBe("_blank");
    expect(jobLink.getAttribute("rel")).toBe("noopener noreferrer");

    expect(screen.getByRole("button", { name: "Save status" })).toBeTruthy();
    const timeline = screen
      .getByRole("heading", { level: 2, name: "Timeline" })
      .closest("section")!;
    expect(
      within(timeline)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Saved Nov 1, 2026, 7:00 AM", "Applied Nov 14, 2026, 11:30 PM"]);
    expect(
      screen.getByRole("link", { name: "Edit" }).getAttribute("href"),
    ).toBe("/applications/app-1/edit");
    expect(trashButton()).toHaveProperty("disabled", false);
  });

  it("shows Not found on a 404", async () => {
    await renderDetail(
      jsonResponse(404, { error: "Not found", requestId: "req-1" }),
    );

    expect(
      await screen.findByRole("heading", { level: 1, name: "Not found" }),
    ).toBeTruthy();
  });

  it("shows another failure's message, and Try again loads it", async () => {
    const fetchSpy = await renderDetail(
      jsonResponse(500, { error: "Something went wrong", requestId: "req-1" }),
    );
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, application));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Something went wrong",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Acme" }),
    ).toBeTruthy();
  });

  it("moves it to Trash and shows the list", async () => {
    const fetchSpy = await renderLoaded();
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(jsonResponse(200, []));

    fireEvent.click(trashButton());

    await screen.findByRole("heading", { level: 1, name: "Applications" });
    const [path, init] = fetchSpy.mock.calls[2];
    expect(path).toBe("/api/applications/app-1");
    expect(init?.method).toBe("DELETE");
    // The list's GET is the only request after the DELETE: the removed
    // detail isn't fetched again.
    expect(fetchSpy.mock.calls[3][0]).toBe("/api/applications");
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(queryClient.getQueryData(["application", "app-1"])).toBeUndefined();
  });

  it("sends no second DELETE while the first is pending", async () => {
    const fetchSpy = await renderLoaded();
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));

    fireEvent.click(trashButton());
    await vi.waitFor(() =>
      expect(trashButton()).toHaveProperty("disabled", true),
    );
    fireEvent.click(trashButton());

    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it("shows a failed Move to Trash's message and stays", async () => {
    const fetchSpy = await renderLoaded();
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Something went wrong", requestId: "req-1" }),
    );

    fireEvent.click(trashButton());

    const alert = await within(trashButton().parentElement!).findByRole(
      "alert",
    );
    expect(alert.textContent).toBe("Something went wrong");
    expect(
      screen.getByRole("heading", { level: 1, name: "Acme" }),
    ).toBeTruthy();
    expect(trashButton()).toHaveProperty("disabled", false);
  });
});
