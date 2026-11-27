import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MESSAGES } from "../../../shared/fields.js";
import { queryClient } from "../queryClient";
import { renderWithProviders } from "../test/render";
import { buildDetail, jsonResponse } from "../test/responses";
import QuickStatus from "./QuickStatus";

type Control = HTMLInputElement | HTMLSelectElement;

function field(label: string) {
  return screen.getByLabelText(label) as Control;
}

function chooseStatus(value: string) {
  fireEvent.change(field("Status"), { target: { value } });
}

function setAppliedDate(value: string) {
  fireEvent.change(field("Applied date"), { target: { value } });
}

function saveButton() {
  return screen.getByRole("button", { name: "Save status" });
}

// The text of the element a field's aria-describedby points at.
function messageUnder(label: string) {
  const id = field(label).getAttribute("aria-describedby");
  return id === null ? null : document.getElementById(id)?.textContent;
}

// A Saved application with no date. Each test queues its fetch answers.
function renderQuickStatus() {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  renderWithProviders(<QuickStatus application={buildDetail()} />);
  return fetchSpy;
}

// 23:30 in New York on 2026-11-14 is already 2026-11-15 in UTC.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T23:30:00-05:00"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QuickStatus", () => {
  it("shows the stored status and date", () => {
    renderWithProviders(
      <QuickStatus
        application={buildDetail({
          status: "applied",
          appliedDate: "2026-11-10",
        })}
      />,
    );

    expect(field("Status").value).toBe("applied");
    expect(field("Applied date").value).toBe("2026-11-10");
  });

  it("fills in today's local date on choosing Applied, and lets the user change it", () => {
    renderQuickStatus();

    chooseStatus("applied");
    expect(field("Applied date").value).toBe("2026-11-14");

    setAppliedDate("2026-11-10");
    expect(field("Applied date").value).toBe("2026-11-10");
  });

  it("sends one PATCH holding only the changed values", async () => {
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, buildDetail()));
    chooseStatus("applied");

    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    const [path, init] = fetchSpy.mock.calls[0];
    expect(path).toBe("/api/applications/app-1");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(init?.body as string)).toEqual({
      status: "applied",
      appliedDate: "2026-11-14",
    });
  });

  it("sends only the date when only the date changed", async () => {
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, buildDetail()));
    setAppliedDate("2026-11-10");

    fireEvent.click(saveButton());

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)).toEqual({
      appliedDate: "2026-11-10",
    });
  });

  it("disables Save with no changes", () => {
    renderQuickStatus();

    expect(saveButton()).toHaveProperty("disabled", true);
  });

  it("sends no second request while the PATCH is pending", async () => {
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockReturnValueOnce(new Promise(() => {}));
    chooseStatus("applied");

    fireEvent.click(saveButton());
    await waitFor(() => expect(saveButton()).toHaveProperty("disabled", true));
    fireEvent.click(saveButton());

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("shows a field message under its control and keeps the chosen values", async () => {
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(400, {
        error: MESSAGES.checkFields,
        fields: { appliedDate: MESSAGES.futureDate },
        requestId: "req-1",
      }),
    );
    chooseStatus("applied");

    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(messageUnder("Applied date")).toBe(MESSAGES.futureDate),
    );
    expect(messageUnder("Status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field("Status").value).toBe("applied");
    expect(field("Applied date").value).toBe("2026-11-14");
  });

  it("shows any other error next to Save and keeps the chosen values", async () => {
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(500, { error: "Something went wrong", requestId: "req-1" }),
    );
    chooseStatus("applied");

    fireEvent.click(saveButton());

    const alert = await within(saveButton().parentElement!).findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong");
    expect(field("Status").value).toBe("applied");
    expect(field("Applied date").value).toBe("2026-11-14");
  });

  it("invalidates the list and this application on success", async () => {
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const fetchSpy = renderQuickStatus();
    fetchSpy.mockResolvedValueOnce(jsonResponse(200, buildDetail()));
    chooseStatus("applied");

    fireEvent.click(saveButton());

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["applications"] });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["application", "app-1"],
    });
  });
});
