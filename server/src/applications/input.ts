import { cleanBullets } from "../../../shared/bullets.js";
import {
  MESSAGES,
  WRITABLE_FIELDS,
  type WritableField,
} from "../../../shared/fields.js";
import { HttpError } from "../http/errors.js";
import { parseDay } from "../lib/dates.js";

// The fields ready for Mongoose. Lengths, URL and option values are the
// schema's checks; status keeps its schema default when absent.
export type NormalizedInput = Partial<
  Record<WritableField, string | Date | null>
>;

// company, role and status can't be emptied; the rest become null.
const NOT_EMPTY: ReadonlySet<WritableField> = new Set([
  "company",
  "role",
  "status",
]);
const REQUIRED_ON_CREATE = ["company", "role"] as const;

function isWritable(key: string): key is WritableField {
  return (WRITABLE_FIELDS as readonly string[]).includes(key);
}

export function normalizeInput(
  body: unknown,
  { partial }: { partial: boolean },
): NormalizedInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new HttpError(400, "Invalid request body");
  }

  const fields: Record<string, string> = {};
  const input: NormalizedInput = {};

  for (const [key, raw] of Object.entries(body)) {
    if (!isWritable(key)) {
      fields[key] = MESSAGES.notAllowed;
      continue;
    }
    if (raw !== null && typeof raw !== "string") {
      fields[key] = MESSAGES.notText;
      continue;
    }
    const value =
      raw === null
        ? ""
        : key === "jobDescription"
          ? cleanBullets(raw).trim()
          : raw.trim();
    if (value === "") {
      if (NOT_EMPTY.has(key)) fields[key] = MESSAGES.required;
      else input[key] = null;
      continue;
    }
    if (key === "appliedDate") {
      const day = parseDay(value, new Date());
      if (typeof day === "string") fields[key] = day;
      else input[key] = day;
      continue;
    }
    input[key] = value;
  }

  if (!partial) {
    for (const key of REQUIRED_ON_CREATE) {
      if (!Object.hasOwn(body, key)) fields[key] = MESSAGES.required;
    }
  }

  if (Object.keys(fields).length > 0) {
    throw new HttpError(400, MESSAGES.checkFields, fields);
  }
  return input;
}
