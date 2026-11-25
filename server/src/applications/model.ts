import mongoose from "mongoose";
import {
  LIMITS,
  MESSAGES,
  STATUSES,
  WORK_MODES,
} from "../../../shared/fields.js";
import { formatDay } from "../lib/dates.js";

// Trimmed text up to its limit; null when empty (normalizeInput does that).
function optionalText(limit: number) {
  return {
    type: String,
    default: null,
    trim: true,
    maxlength: [limit, MESSAGES.tooLong(limit)] as [number, string],
  };
}

function requiredText(limit: number) {
  return {
    type: String,
    required: [true, MESSAGES.required] as [boolean, string],
    trim: true,
    maxlength: [limit, MESSAGES.tooLong(limit)] as [number, string],
  };
}

// Server-only and always copied from a status that has just passed
// validation, so it carries no enum of its own (an invalid status would
// otherwise also be reported as "statusHistory.0.status").
const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, required: true },
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    company: requiredText(LIMITS.company),
    role: requiredText(LIMITS.role),
    status: {
      type: String,
      required: [true, MESSAGES.required],
      enum: { values: STATUSES, message: MESSAGES.badOption },
      default: "saved",
    },
    appliedDate: { type: Date, default: null },
    jobUrl: {
      ...optionalText(LIMITS.jobUrl),
      validate: {
        validator: (v: string | null) => v === null || /^https?:\/\//i.test(v),
        message: MESSAGES.badUrl,
      },
    },
    location: optionalText(LIMITS.location),
    salaryRange: optionalText(LIMITS.salaryRange),
    workMode: {
      type: String,
      default: null,
      enum: { values: [...WORK_MODES, null], message: MESSAGES.badOption },
    },
    nextStep: optionalText(LIMITS.nextStep),
    jobDescription: optionalText(LIMITS.jobDescription),
    coverLetter: optionalText(LIMITS.coverLetter),
    statusHistory: { type: [statusHistorySchema], required: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.userId;
        ret.appliedDate =
          ret.appliedDate instanceof Date ? formatDay(ret.appliedDate) : null;
        return ret;
      },
    },
  },
);

applicationSchema.index({ userId: 1, deletedAt: 1, appliedDate: -1 });

export const Application = mongoose.model("Application", applicationSchema);
