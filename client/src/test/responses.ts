import type {
  ApplicationDetail,
  ApplicationSummary,
} from "../../../shared/api.js";

// A JSON answer with the Content-Type the server sends, for tests that mock
// fetch.
export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// A list row as GET /api/applications sends it, with only company and role
// filled unless overrides say otherwise.
export function buildSummary(
  overrides: Partial<ApplicationSummary> = {},
): ApplicationSummary {
  return {
    id: "app-1",
    company: "Acme",
    role: "Engineer",
    status: "saved",
    appliedDate: null,
    location: null,
    workMode: null,
    salaryRange: null,
    nextStep: null,
    createdAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

// An application as GET /api/applications/:id sends it: a list row's fields,
// a one-entry history, and every optional field null unless overrides say
// otherwise.
export function buildDetail(
  overrides: Partial<ApplicationDetail> = {},
): ApplicationDetail {
  return {
    ...buildSummary(),
    jobUrl: null,
    jobDescription: null,
    coverLetter: null,
    statusHistory: [{ status: "saved", changedAt: "2026-11-01T12:00:00.000Z" }],
    deletedAt: null,
    updatedAt: "2026-11-01T12:00:00.000Z",
    ...overrides,
  };
}

// What requireAuth answers on /api/* without a session.
export function notSignedIn(): Response {
  return jsonResponse(401, { error: "Not signed in", requestId: "req-1" });
}
