import type { Status } from "../../../shared/fields.js";

// The applied date rule: a change to applied with no date fills in today's
// local date, which the user can still change. Every other change keeps the
// date as it is, including applied back to saved. Dates are YYYY-MM-DD, with
// "" for an empty one.
export function nextAppliedDate(
  nextStatus: Status,
  currentDate: string,
  today: string,
): string {
  return nextStatus === "applied" && currentDate === "" ? today : currentDate;
}
