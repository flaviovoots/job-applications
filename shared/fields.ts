// The application fields' values, labels, limits and messages, shared by the
// server's schema and checks, the client's forms, and the tests.

export const STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
  "no_response",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  no_response: "No response",
};

export const OPEN_STATUSES: readonly Status[] = [
  "saved",
  "applied",
  "interviewing",
];

export const CLOSED_STATUSES: readonly Status[] = [
  "offer",
  "rejected",
  "withdrawn",
  "no_response",
];

export const WORK_MODES = ["remote", "hybrid", "onsite"] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export const LIMITS = {
  company: 150,
  role: 150,
  jobUrl: 2048,
  location: 150,
  salaryRange: 100,
  nextStep: 1000,
  jobDescription: 10000,
  coverLetter: 10000,
  note: 2000,
} as const;

export const WRITABLE_FIELDS = [
  "company",
  "role",
  "status",
  "appliedDate",
  "jobUrl",
  "location",
  "salaryRange",
  "workMode",
  "nextStep",
  "jobDescription",
  "coverLetter",
] as const;

export type WritableField = (typeof WRITABLE_FIELDS)[number];

// Field messages, plus the error a 400 with fields carries.
export const MESSAGES = {
  required: "Required",
  tooLong: (limit: number) =>
    `At most ${limit.toLocaleString("en-US")} characters`,
  notAllowed: "Not allowed",
  notText: "Must be text",
  badUrl: "Must start with http:// or https://",
  badOption: "Not a valid option",
  badDate: "Use a real date (YYYY-MM-DD)",
  futureDate: "Can't be in the future",
  checkFields: "Check the fields",
} as const;
