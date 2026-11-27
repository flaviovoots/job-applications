import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import type {
  ApplicationDetail,
  ApplicationInput,
} from "../../../shared/api.js";
import { cleanBullets } from "../../../shared/bullets.js";
import {
  LIMITS,
  STATUSES,
  STATUS_LABELS,
  WORK_MODES,
  WORK_MODE_LABELS,
  WRITABLE_FIELDS,
  type Status,
  type WorkMode,
  type WritableField,
} from "../../../shared/fields.js";
import { ApiError, apiFetch } from "../api";
import CharCounter from "../components/CharCounter";
import { nextAppliedDate } from "../lib/appliedDateRule";
import { todayLocal } from "../lib/dates";
import NotFoundPage from "./NotFoundPage";

type Values = Record<WritableField, string>;

const EMPTY: Values = {
  company: "",
  role: "",
  status: "saved",
  appliedDate: "",
  jobUrl: "",
  location: "",
  salaryRange: "",
  workMode: "",
  nextStep: "",
  jobDescription: "",
  coverLetter: "",
};

// Strings go as typed: the server trims them and turns an empty optional
// field into null. The select options come from STATUSES and WORK_MODES.
function toInput(values: Values): ApplicationInput {
  return {
    ...values,
    status: values.status as Status,
    workMode: (values.workMode || null) as WorkMode | null,
  };
}

// A stored application as form values, with null as "".
function toValues(application: ApplicationDetail): Values {
  return Object.fromEntries(
    WRITABLE_FIELDS.map((name) => [name, application[name] ?? ""]),
  ) as Values;
}

// The fields that differ from start, as the PATCH sends them.
function changedFields(
  start: Values,
  values: Values,
): Partial<ApplicationInput> {
  const input = toInput(values);
  return Object.fromEntries(
    WRITABLE_FIELDS.filter((name) => values[name] !== start[name]).map(
      (name) => [name, input[name]],
    ),
  ) as Partial<ApplicationInput>;
}

// Create mode has no id and starts empty; edit mode starts from the loaded
// detail.
function ApplicationForm({ id, initial }: { id?: string; initial: Values }) {
  // The edit's change check compares against the values the form opened
  // with, not a refetch's, so a field the user didn't touch never goes in the
  // PATCH.
  const [start] = useState(initial);
  const [values, setValues] = useState(initial);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const backTo = id === undefined ? "/" : `/applications/${id}`;

  // A failed save never navigates or resets the form; the user saves again.
  const save = useMutation({
    mutationFn: (body: Partial<ApplicationInput>) =>
      id === undefined
        ? apiFetch<ApplicationDetail>("/api/applications", {
            method: "POST",
            body,
          })
        : apiFetch<ApplicationDetail>(`/api/applications/${id}`, {
            method: "PATCH",
            body,
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      if (id !== undefined) {
        void queryClient.invalidateQueries({ queryKey: ["application", id] });
      }
      void navigate(backTo);
    },
  });

  const fieldMessages =
    save.error instanceof ApiError ? save.error.fields : undefined;
  const otherError = save.error && !fieldMessages ? save.error.message : null;

  // The props every control shares; a field message is its description.
  function control(name: WritableField) {
    const message = fieldMessages?.[name];
    return {
      id: name,
      name,
      value: values[name],
      onChange: (
        e: ChangeEvent<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >,
      ) => {
        const { value } = e.target;
        setValues((current) => ({ ...current, [name]: value }));
      },
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? `${name}-error` : undefined,
      className: "rounded border border-gray-300 px-2 py-1",
    };
  }

  // The status select's own handler, for the applied date rule.
  function onStatusChange(e: ChangeEvent<HTMLSelectElement>) {
    const status = e.target.value as Status;
    const today = todayLocal();
    setValues((current) => ({
      ...current,
      status,
      appliedDate: nextAppliedDate(status, current.appliedDate, today),
    }));
  }

  // A label, the control (children), and the field's message under it.
  function field(name: WritableField, label: string, children: ReactNode) {
    const message = fieldMessages?.[name];
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={name} className="font-medium">
          {label}
        </label>
        {children}
        {message && (
          <p id={`${name}-error`} className="text-sm text-red-700">
            {message}
          </p>
        )}
      </div>
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (id === undefined) {
      save.mutate(toInput(values));
      return;
    }
    // An edit sends only the changed fields; with none it sends nothing.
    const change = changedFields(start, values);
    if (Object.keys(change).length > 0) save.mutate(change);
    else void navigate(backTo);
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {id === undefined ? "New application" : "Edit application"}
      </h1>
      {/* noValidate, and no maxLength, required or pattern: the server's 400
          is what the user sees. */}
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
        {field("company", "Company", <input {...control("company")} />)}
        {field("role", "Role", <input {...control("role")} />)}
        {field(
          "status",
          "Status",
          <select {...control("status")} onChange={onStatusChange}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "appliedDate",
          "Applied date",
          <input type="date" {...control("appliedDate")} />,
        )}
        {field(
          "jobUrl",
          "Job URL",
          <input type="url" {...control("jobUrl")} />,
        )}
        {field("location", "Location", <input {...control("location")} />)}
        {field(
          "salaryRange",
          "Salary range",
          <input {...control("salaryRange")} />,
        )}
        {field(
          "workMode",
          "Work mode",
          <select {...control("workMode")}>
            <option value="">Not set</option>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {WORK_MODE_LABELS[mode]}
              </option>
            ))}
          </select>,
        )}
        {field("nextStep", "Next step", <input {...control("nextStep")} />)}
        {field(
          "jobDescription",
          "Job description",
          <>
            <textarea rows={8} {...control("jobDescription")} />
            {/* The server cleans bullets before its length check. */}
            <CharCounter
              n={cleanBullets(values.jobDescription).length}
              limit={LIMITS.jobDescription}
            />
          </>,
        )}
        {field(
          "coverLetter",
          "Cover letter",
          <>
            <textarea rows={8} {...control("coverLetter")} />
            <CharCounter
              n={values.coverLetter.length}
              limit={LIMITS.coverLetter}
            />
          </>,
        )}

        {otherError && (
          <p role="alert" className="text-red-700">
            {otherError}
          </p>
        )}
        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={save.isPending}
            className="rounded bg-gray-900 px-4 py-1 text-white disabled:opacity-50"
          >
            Save
          </button>
          <Link to={backTo} className="underline">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

// Edit mode loads the stored application before the form opens.
function EditApplication({ id }: { id: string }) {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["application", id],
    queryFn: () => apiFetch<ApplicationDetail>(`/api/applications/${id}`),
  });

  // Data first, as on the detail page: a failed refetch keeps the form.
  if (data) return <ApplicationForm id={id} initial={toValues(data)} />;
  if (error instanceof ApiError && error.status === 404) {
    return <NotFoundPage />;
  }
  if (error) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p role="alert">{error.message}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Try again
        </button>
      </div>
    );
  }
  return <p>Loading…</p>;
}

export default function ApplicationFormPage() {
  const { id } = useParams();
  return id === undefined ? (
    <ApplicationForm initial={EMPTY} />
  ) : (
    <EditApplication id={id} />
  );
}
