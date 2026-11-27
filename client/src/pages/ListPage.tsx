import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import type { ApplicationSummary } from "../../../shared/api.js";
import { STATUS_LABELS, WORK_MODE_LABELS } from "../../../shared/fields.js";
import { apiFetch } from "../api";
import { displayDay } from "../lib/dates";
import { sortApplications } from "../lib/listView";

// Shown from Tailwind's sm breakpoint up; below it, company, role and status
// fit a phone without sideways scrolling.
const wide = "hidden sm:table-cell";

// The row's one link. Its ::after box covers the row (the <tr> is relative),
// so a tap anywhere on the row opens the detail page and Tab stops once per
// row. The focus ring is drawn on that box, around the whole row.
const rowLink =
  "after:absolute after:inset-0 after:outline-blue-600 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2";

function Table({ list }: { list: ApplicationSummary[] }) {
  return (
    <table className="w-full text-left text-sm wrap-anywhere">
      <thead className="border-b border-gray-300">
        <tr>
          <th className="py-2 pr-3">Company</th>
          <th className="py-2 pr-3">Role</th>
          <th className="py-2 pr-3">Status</th>
          <th className={`${wide} py-2 pr-3`}>Location</th>
          <th className={`${wide} py-2 pr-3`}>Applied</th>
          <th className={`${wide} py-2`}>Work mode</th>
        </tr>
      </thead>
      <tbody>
        {sortApplications(list).map((row) => (
          <tr
            key={row.id}
            className="relative border-b border-gray-200 hover:bg-gray-50"
          >
            <td className="py-2 pr-3 font-medium">
              <Link to={`/applications/${row.id}`} className={rowLink}>
                {row.company}
              </Link>
            </td>
            <td className="py-2 pr-3">{row.role}</td>
            <td className="py-2 pr-3">{STATUS_LABELS[row.status]}</td>
            <td className={`${wide} py-2 pr-3`}>{row.location}</td>
            <td className={`${wide} py-2 pr-3`}>
              {row.appliedDate && displayDay(row.appliedDate)}
            </td>
            <td className={`${wide} py-2`}>
              {row.workMode && WORK_MODE_LABELS[row.workMode]}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ListPage() {
  const { data, error, refetch, isFetching } = useQuery({
    queryKey: ["applications"],
    queryFn: () => apiFetch<ApplicationSummary[]>("/api/applications"),
  });

  // Data first, as in App: a failed refetch keeps the rows on screen.
  let body;
  if (data) {
    body =
      data.length > 0 ? (
        <Table list={data} />
      ) : (
        <p>No job applications yet. Add one to get started.</p>
      );
  } else if (error) {
    body = (
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
  } else {
    body = <p>Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <Link
          to="/applications/new"
          className="rounded bg-gray-900 px-3 py-1 text-sm text-white"
        >
          New application
        </Link>
      </div>
      {body}
    </div>
  );
}
