// Today's calendar date in the user's zone, as YYYY-MM-DD.
export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const dayFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

// A YYYY-MM-DD calendar date for display. new Date("YYYY-MM-DD") is UTC
// midnight, so formatting in UTC keeps the same day in every zone.
export function displayDay(yyyyMmDd: string): string {
  return dayFormat.format(new Date(yyyyMmDd));
}

// No timeZone, so the browser's own zone applies.
const timeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

// An ISO instant (such as a status change's changedAt) in local time.
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}
