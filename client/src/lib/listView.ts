import type { ApplicationSummary } from "../../../shared/api.js";

// Newest first for two strings that sort as text: YYYY-MM-DD dates and the
// server's ISO timestamps.
function newestFirst(a: string, b: string): number {
  return a < b ? 1 : a > b ? -1 : 0;
}

// The default order: no applied date first (still to apply), then applied
// date newest first, with ties by created date newest first.
export function sortApplications(
  list: readonly ApplicationSummary[],
): ApplicationSummary[] {
  return list.toSorted((a, b) => {
    if (a.appliedDate !== b.appliedDate) {
      if (a.appliedDate === null) return -1;
      if (b.appliedDate === null) return 1;
      return newestFirst(a.appliedDate, b.appliedDate);
    }
    return newestFirst(a.createdAt, b.createdAt);
  });
}
