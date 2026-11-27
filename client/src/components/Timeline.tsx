import type { StatusHistoryEntry } from "../../../shared/api.js";
import { STATUS_LABELS } from "../../../shared/fields.js";
import { formatTime } from "../lib/dates";

// Oldest first for the server's ISO timestamps, which sort as text.
function oldestFirst(a: StatusHistoryEntry, b: StatusHistoryEntry): number {
  return a.changedAt < b.changedAt ? -1 : a.changedAt > b.changedAt ? 1 : 0;
}

// An application's status changes, oldest first, in the browser's zone. The
// label shows as text until Stage 6 adds StatusBadge.
export default function Timeline({
  history,
}: {
  history: StatusHistoryEntry[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Timeline</h2>
      <ol className="flex flex-col gap-1">
        {history.toSorted(oldestFirst).map((entry) => (
          <li
            key={`${entry.changedAt}-${entry.status}`}
            className="flex flex-wrap gap-x-2"
          >
            <span className="font-medium">{STATUS_LABELS[entry.status]}</span>{" "}
            <time dateTime={entry.changedAt} className="text-gray-600">
              {formatTime(entry.changedAt)}
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
