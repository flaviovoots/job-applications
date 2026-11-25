// The only module that calls the Application model. Every function takes
// userId first and filters with active() (trashed() comes in Stage 5).
import type { NormalizedInput } from "./input.js";
import { Application } from "./model.js";

export function active(userId: string) {
  return { userId, deletedAt: null };
}

// The ApplicationSummary fields (_id comes with any projection).
const SUMMARY =
  "company role status appliedDate location workMode salaryRange nextStep createdAt";

export function listActive(userId: string) {
  return Application.find(active(userId), SUMMARY);
}

export function create(userId: string, input: NormalizedInput) {
  const doc = new Application({ ...input, userId });
  // doc.status already holds the schema default when input has none.
  doc.statusHistory.push({ status: doc.status, changedAt: new Date() });
  return doc.save();
}
