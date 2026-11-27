import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  ApplicationDetail,
  ApplicationInput,
} from "../../../shared/api.js";
import {
  STATUSES,
  STATUS_LABELS,
  type Status,
} from "../../../shared/fields.js";
import { ApiError, apiFetch } from "../api";
import { nextAppliedDate } from "../lib/appliedDateRule";
import { todayLocal } from "../lib/dates";

type StatusChange = Partial<Pick<ApplicationInput, "status" | "appliedDate">>;

const controlClass = "rounded border border-gray-300 px-2 py-1";

// The detail page's status select and applied date, saved on their own. The
// page renders it with key={application.updatedAt}, so a saved change resets
// this state from the new data.
export default function QuickStatus({
  application,
}: {
  application: ApplicationDetail;
}) {
  const storedDate = application.appliedDate ?? "";
  const [status, setStatus] = useState<Status>(application.status);
  const [appliedDate, setAppliedDate] = useState(storedDate);
  const queryClient = useQueryClient();

  // A failed save keeps the chosen values; the user saves again.
  const save = useMutation({
    mutationFn: (change: StatusChange) =>
      apiFetch<ApplicationDetail>(`/api/applications/${application.id}`, {
        method: "PATCH",
        body: change,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({
        queryKey: ["application", application.id],
      });
    },
  });

  // Only what differs from the stored values goes in the PATCH.
  const change: StatusChange = {};
  if (status !== application.status) change.status = status;
  if (appliedDate !== storedDate) change.appliedDate = appliedDate;
  const changed = Object.keys(change).length > 0;

  const fieldMessages =
    save.error instanceof ApiError ? save.error.fields : undefined;
  const otherError = save.error && !fieldMessages ? save.error.message : null;

  // The applied date rule, as in the create form.
  function onStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Status;
    const today = todayLocal();
    setStatus(next);
    setAppliedDate((current) => nextAppliedDate(next, current, today));
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (changed && !save.isPending) save.mutate(change);
  }

  // A field message is its control's description.
  function describedBy(name: "status" | "appliedDate", id: string) {
    const message = fieldMessages?.[name];
    return {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${id}-error` : undefined,
    };
  }

  function message(name: "status" | "appliedDate", id: string) {
    const text = fieldMessages?.[name];
    return (
      text && (
        <p id={`${id}-error`} className="text-sm text-red-700">
          {text}
        </p>
      )
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-wrap items-start gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="quick-status" className="font-medium">
          Status
        </label>
        <select
          id="quick-status"
          value={status}
          onChange={onStatusChange}
          className={controlClass}
          {...describedBy("status", "quick-status")}
        >
          {STATUSES.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABELS[option]}
            </option>
          ))}
        </select>
        {message("status", "quick-status")}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="quick-applied-date" className="font-medium">
          Applied date
        </label>
        <input
          id="quick-applied-date"
          type="date"
          value={appliedDate}
          onChange={(e) => setAppliedDate(e.target.value)}
          className={controlClass}
          {...describedBy("appliedDate", "quick-applied-date")}
        />
        {message("appliedDate", "quick-applied-date")}
      </div>
      <div className="flex flex-wrap items-center gap-4 self-end">
        <button
          type="submit"
          disabled={!changed || save.isPending}
          className="rounded bg-gray-900 px-4 py-1 text-white disabled:opacity-50"
        >
          Save status
        </button>
        {otherError && (
          <p role="alert" className="text-red-700">
            {otherError}
          </p>
        )}
      </div>
    </form>
  );
}
