import { MESSAGES } from "../../../shared/fields.js";

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

// A calendar date as UTC midnight, or the message saying why it's refused.
// The cut-off is tomorrow in UTC, so a user west of UTC can still enter
// today's local date in the evening.
export function parseDay(s: string, now: Date): Date | string {
  const match = DAY.exec(s);
  if (!match) return MESSAGES.badDate;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC rolls 2026-02-30 over to March 2, so the round trip differs.
  if (formatDay(date) !== s) return MESSAGES.badDate;
  const tomorrow = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  if (date.getTime() > tomorrow) return MESSAGES.futureDate;
  return date;
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
