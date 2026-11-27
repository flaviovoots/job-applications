import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "../App";
import { renderWithProviders } from "../test/render";
import { buildDetail, jsonResponse, notSignedIn } from "../test/responses";

const email = "alice@example.com";

// What the user types or picks in each field, by its label.
const typed: Record<string, string> = {
  Company: "Acme",
  Role: "Engineer",
  Status: "applied",
  "Applied date": "2026-11-10",
  "Job URL": "https://example.com/job",
  Location: "Lisbon",
  "Salary range": "€50k",
  "Work mode": "remote",
  "Next step": "Call on Tuesday",
  "Job description": "Build things",
  "Cover letter": "Dear Acme",
};

type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function field(label: string) {
  return screen.getByLabelText(label) as Control;
}

function fillEveryField() {
  for (const [label, value] of Object.entries(typed)) {
    fireEvent.change(field(label), { target: { value } });
  }
}

function expectEveryFieldKept() {
  for (const [label, value] of Object.entries(typed)) {
    expect(field(label).value, label).toBe(value);
  }
}

function saveButton() {
  return screen.getByRole("button", { name: "Save" });
}

// The text of the element a field's aria-describedby points at.
function messageUnder(label: string) {
  const id = field(label).getAttribute("aria-describedby");
  return id === null ? null : document.getElementById(id)?.textContent;
}

// Each test queues fetch answers after GET /api/me's 200.
async function renderForm() {
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(jsonResponse(200, { email }));
  renderWithProviders(<App />, { url: "/applications/new" });
  await screen.findByRole("heading", { level: 1, name: "New application" });
  return fetchSpy;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ApplicationFormPage", () => {
  it("has the eleven fields with their defaults and no browser checks", async () => {
    await renderForm();

    for (const label of Object.keys(typed)) expect(field(label)).toBeTruthy();
    expect(field("Status").value).toBe("saved");
    expect(
      (field("Status") as HTMLSelectElement).selectedOptions[0].textContent,
    ).toBe("Saved");
    expect(
      (field("Work mode") as HTMLSelectElement).selectedOptions[0].textContent,
    ).toBe("Not set");
    expect(field("Applied date").getAttribute("type")).toBe("date");
    expect(field("Job description").tagName).toBe("TEXTAREA");
    expect(field("Cover letter").tagName).toBe("TEXTAREA");

    const form = saveButton().closest("form")!;
    expect(form.noValidate).toBe(true);
    expect(form.querySelector("[maxlength], [required], [pattern]")).toBeNull();
  });

  it("counts the job description after bullet cleanup", async () => {
    await renderForm();

    // "a•b" is saved as "a\n•b", four characters.
    fireEvent.change(field("Job description"), { target: { value: "a•b" } });

    expect(screen.getByText("4 / 10,000")).toBeTruthy();
  });

  it("posts the values, with Not set as null, then shows the list", async () => {
    const fetchSpy = await renderForm();
    fetchSpy
      .mockResolvedValueOnce(jsonResponse(201, {}))
      .mockResolvedValueOnce(jsonResponse(200, []));
    fireEvent.change(field("Company"), { target: { value: "Acme" } });
    fireEvent.change(field("Role"), { target: { value: "Engineer" } });

    fireEvent.click(saveButton());

    await screen.findByRole("heading", { level: 1, name: "Applications" });
    const [path, init] = fetchSpy.mock.calls[1];
    expect(path).toBe("/api/applications");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({
      company: "Acme",
      role: "Engineer",
      status: "saved",
      appliedDate: "",
      jobUrl: "",
      location: "",
      salaryRange: "",
      workMode: null,
      nextStep: "",
      jobDescription: "",
      coverLetter: "",
    });
  });

  it("shows a field message under its field", async () => {
    const fetchSpy = await renderForm();
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(400, {
        error: "Check the fields",
        fields: { company: "Required" },
        requestId: "req-1",
      }),
    );

    fireEvent.click(saveButton());

    await waitFor(() => expect(messageUnder("Company")).toBe("Required"));
    expect(messageUnder("Role")).toBeNull();
  });

  it("keeps every typed value and shows the banner on a 401", async () => {
    const fetchSpy = await renderForm();
    fetchSpy.mockResolvedValueOnce(notSignedIn());
    fillEveryField();

    fireEvent.click(saveButton());

    await screen.findByRole("status");
    expectEveryFieldKept();
  });

  it("keeps every typed value when the answer isn't JSON", async () => {
    const fetchSpy = await renderForm();
    fetchSpy.mockResolvedValueOnce(
      new Response("<html>Loading…</html>", {
        status: 200,
        headers: { "Content-Type": "text/html" },
      }),
    );
    fillEveryField();

    fireEvent.click(saveButton());

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Couldn't reach the server. Try again.",
    );
    expectEveryFieldKept();
  });

  it("sends no second request while the POST is pending", async () => {
    const fetchSpy = await renderForm();
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.change(field("Company"), { target: { value: "Acme" } });
    fireEvent.change(field("Role"), { target: { value: "Engineer" } });

    fireEvent.click(saveButton());
    await waitFor(() => expect(saveButton()).toHaveProperty("disabled", true));
    fireEvent.click(saveButton());

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  describe("applied date rule", () => {
    // 23:30 in New York on 2026-11-14 is already 2026-11-15 in UTC. Date is
    // faked after the render, so only the change handlers see it.
    async function renderFormOnNov14() {
      await renderForm();
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-14T23:30:00-05:00"));
    }

    function chooseStatus(value: string) {
      fireEvent.change(field("Status"), { target: { value } });
    }

    function setAppliedDate(value: string) {
      fireEvent.change(field("Applied date"), { target: { value } });
    }

    it("fills in today's local date on choosing Applied with no date", async () => {
      await renderFormOnNov14();

      chooseStatus("applied");

      expect(field("Applied date").value).toBe("2026-11-14");
    });

    it("keeps a date already set on choosing Applied", async () => {
      await renderFormOnNov14();
      setAppliedDate("2026-11-01");

      chooseStatus("applied");

      expect(field("Applied date").value).toBe("2026-11-01");
    });

    it("lets the user change the filled date", async () => {
      await renderFormOnNov14();
      chooseStatus("applied");
      expect(field("Applied date").value).toBe("2026-11-14");

      setAppliedDate("2026-11-10");

      expect(field("Applied date").value).toBe("2026-11-10");
    });
  });

  describe("edit mode", () => {
    // Every stored value differs from what fillEveryField types.
    const stored = buildDetail({
      company: "Globex",
      role: "Designer",
      status: "interviewing",
      appliedDate: "2026-11-05",
      location: "Porto",
      workMode: "hybrid",
    });

    // GET /api/me answers 200, then the detail's answer. Each test queues
    // the answers after those.
    async function renderEdit(detail: Response) {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(jsonResponse(200, { email }))
        .mockResolvedValueOnce(detail);
      renderWithProviders(<App />, { url: "/applications/app-1/edit" });
      return fetchSpy;
    }

    async function renderLoaded() {
      const fetchSpy = await renderEdit(jsonResponse(200, stored));
      await screen.findByRole("heading", {
        level: 1,
        name: "Edit application",
      });
      return fetchSpy;
    }

    it("shows the stored values, with null as empty", async () => {
      const fetchSpy = await renderLoaded();

      expect(fetchSpy.mock.calls[1][0]).toBe("/api/applications/app-1");
      expect(
        Object.fromEntries(
          Object.keys(typed).map((label) => [label, field(label).value]),
        ),
      ).toEqual({
        Company: "Globex",
        Role: "Designer",
        Status: "interviewing",
        "Applied date": "2026-11-05",
        "Job URL": "",
        Location: "Porto",
        "Salary range": "",
        "Work mode": "hybrid",
        "Next step": "",
        "Job description": "",
        "Cover letter": "",
      });
      expect(
        screen.getByRole("link", { name: "Cancel" }).getAttribute("href"),
      ).toBe("/applications/app-1");
    });

    it("sends only the changed field, then shows the detail page", async () => {
      const fetchSpy = await renderLoaded();
      const updated = { ...stored, location: "Lisbon" };
      fetchSpy
        .mockResolvedValueOnce(jsonResponse(200, updated))
        .mockResolvedValueOnce(jsonResponse(200, updated));
      fireEvent.change(field("Location"), { target: { value: "Lisbon" } });

      fireEvent.click(saveButton());

      // The detail page shows the refetched value.
      await screen.findByText("Lisbon", { selector: "dd" });
      const [path, init] = fetchSpy.mock.calls[2];
      expect(path).toBe("/api/applications/app-1");
      expect(init?.method).toBe("PATCH");
      expect(JSON.parse(init?.body as string)).toEqual({ location: "Lisbon" });
    });

    it("sends no PATCH with no changes, and shows the detail page", async () => {
      const fetchSpy = await renderLoaded();
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, stored));

      fireEvent.click(saveButton());

      await screen.findByRole("heading", { level: 1, name: "Globex" });
      // The detail page's refetch of its stale query is the only request.
      expect(
        fetchSpy.mock.calls
          .slice(2)
          .map(([path, init]) => [path, init?.method]),
      ).toEqual([["/api/applications/app-1", "GET"]]);
    });

    it("keeps every typed value and shows the banner on a 401", async () => {
      const fetchSpy = await renderLoaded();
      fetchSpy.mockResolvedValueOnce(notSignedIn());
      fillEveryField();

      fireEvent.click(saveButton());

      await screen.findByRole("status");
      expect(fetchSpy.mock.calls[2][1]?.method).toBe("PATCH");
      expectEveryFieldKept();
    });

    it("shows Not found on a 404", async () => {
      await renderEdit(
        jsonResponse(404, { error: "Not found", requestId: "req-1" }),
      );

      expect(
        await screen.findByRole("heading", { level: 1, name: "Not found" }),
      ).toBeTruthy();
    });

    it("shows another failure's message, and Try again loads it", async () => {
      const fetchSpy = await renderEdit(
        jsonResponse(500, {
          error: "Something went wrong",
          requestId: "req-1",
        }),
      );
      fetchSpy.mockResolvedValueOnce(jsonResponse(200, stored));

      expect((await screen.findByRole("alert")).textContent).toBe(
        "Something went wrong",
      );
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));

      expect(
        await screen.findByRole("heading", {
          level: 1,
          name: "Edit application",
        }),
      ).toBeTruthy();
    });
  });
});
