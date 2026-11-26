// The only module that calls the Application model. Every function takes
// userId first and filters with active() (trashed() comes in Stage 5).
import type { Status } from "../../../shared/fields.js";
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

// A malformed id throws a CastError, which the error handler turns into 404.
export function getActive(userId: string, id: string) {
  return Application.findOne({ ...active(userId), _id: id });
}

// A new status and its history entry are one atomic update, filtered on the
// status being different, so a repeat (even from two tabs at once) adds no
// entry. When that matches nothing, only the other fields change; with none,
// the document is read as it is, so updatedAt stays.
export async function updateActive(
  userId: string,
  id: string,
  fields: NormalizedInput,
  nextStatus?: Status,
) {
  const filter = { ...active(userId), _id: id };
  const options = { returnDocument: "after", runValidators: true } as const;
  if (nextStatus !== undefined) {
    const doc = await Application.findOneAndUpdate(
      { ...filter, status: { $ne: nextStatus } },
      {
        $set: { ...fields, status: nextStatus },
        $push: { statusHistory: { status: nextStatus, changedAt: new Date() } },
      },
      options,
    );
    if (doc !== null) return doc;
  }
  if (Object.keys(fields).length === 0) return Application.findOne(filter);
  return Application.findOneAndUpdate(filter, { $set: fields }, options);
}

// Soft delete: the document keeps its fields and history until Stage 5's
// Delete forever. A matchedCount of 0 means not found (or already in Trash).
export function trash(userId: string, id: string) {
  return Application.updateOne(
    { ...active(userId), _id: id },
    { $set: { deletedAt: new Date() } },
  );
}

export function create(userId: string, input: NormalizedInput) {
  const doc = new Application({ ...input, userId });
  // doc.status already holds the schema default when input has none.
  doc.statusHistory.push({ status: doc.status, changedAt: new Date() });
  return doc.save();
}
