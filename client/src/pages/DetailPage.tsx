import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { ApplicationDetail } from "../../../shared/api.js";
import { STATUS_LABELS, WORK_MODE_LABELS } from "../../../shared/fields.js";
import { ApiError, apiFetch } from "../api";
import QuickStatus from "../components/QuickStatus";
import Timeline from "../components/Timeline";
import { displayDay } from "../lib/dates";
import NotFoundPage from "./NotFoundPage";

// One term and its definition; an empty value shows "Not set".
function Field({
  term,
  value,
  className = "",
}: {
  term: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <>
      <dt className="font-medium">{term}</dt>
      <dd className={`mb-2 wrap-anywhere sm:mb-0 ${className}`}>
        {value ?? <span className="text-gray-600">Not set</span>}
      </dd>
    </>
  );
}

function Detail({ application }: { application: ApplicationDetail }) {
  const { id, appliedDate, jobUrl, workMode } = application;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // No confirmation: Trash keeps it until Delete forever (Stage 5).
  const trash = useMutation({
    mutationFn: () =>
      apiFetch<void>(`/api/applications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["application", id] });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void navigate("/");
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold wrap-anywhere">
          {application.company}
        </h1>
        <p className="text-gray-700 wrap-anywhere">{application.role}</p>
      </div>
      {/* One column on a phone, terms beside definitions from sm up. */}
      <dl className="grid gap-x-4 sm:grid-cols-[max-content_1fr] sm:gap-y-2">
        <Field term="Status" value={STATUS_LABELS[application.status]} />
        <Field
          term="Applied date"
          value={appliedDate && displayDay(appliedDate)}
        />
        <Field
          term="Job URL"
          value={
            jobUrl && (
              <a
                href={jobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {jobUrl}
              </a>
            )
          }
        />
        <Field term="Location" value={application.location} />
        <Field term="Salary range" value={application.salaryRange} />
        <Field
          term="Work mode"
          value={workMode && WORK_MODE_LABELS[workMode]}
        />
        <Field term="Next step" value={application.nextStep} />
        <Field
          term="Job description"
          value={application.jobDescription}
          className="whitespace-pre-wrap"
        />
        <Field
          term="Cover letter"
          value={application.coverLetter}
          className="whitespace-pre-wrap"
        />
      </dl>
      <QuickStatus key={application.updatedAt} application={application} />
      <Timeline history={application.statusHistory} />
      <div className="flex flex-wrap items-center gap-4">
        <Link to={`/applications/${id}/edit`} className="underline">
          Edit
        </Link>
        <button
          type="button"
          onClick={() => trash.mutate()}
          disabled={trash.isPending}
          className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50"
        >
          Move to Trash
        </button>
        {trash.error && (
          <p role="alert" className="text-red-700">
            {trash.error.message}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DetailPage() {
  const { id } = useParams() as { id: string };
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["application", id],
    queryFn: () => apiFetch<ApplicationDetail>(`/api/applications/${id}`),
  });

  // Data first, as on the list: a failed refetch keeps the page on screen.
  if (data) return <Detail application={data} />;
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
