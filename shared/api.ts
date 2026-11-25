// The API's request and response shapes. The client is checked against them
// at compile time; the server's route tests assert each response's exact keys.
import type { Status, WorkMode } from "./fields.js";

export interface StatusHistoryEntry {
  status: Status;
  changedAt: string;
}

// The eleven fields the client may write. appliedDate is YYYY-MM-DD.
export interface ApplicationInput {
  company: string;
  role: string;
  status: Status;
  appliedDate: string | null;
  jobUrl: string | null;
  location: string | null;
  salaryRange: string | null;
  workMode: WorkMode | null;
  nextStep: string | null;
  jobDescription: string | null;
  coverLetter: string | null;
}

export interface ApplicationSummary {
  id: string;
  company: string;
  role: string;
  status: Status;
  appliedDate: string | null;
  location: string | null;
  workMode: WorkMode | null;
  salaryRange: string | null;
  nextStep: string | null;
  createdAt: string;
}

// Notes join in Stage 4b.
export interface ApplicationDetail extends ApplicationSummary {
  jobUrl: string | null;
  jobDescription: string | null;
  coverLetter: string | null;
  statusHistory: StatusHistoryEntry[];
  deletedAt: string | null;
  updatedAt: string;
}

export interface ApiErrorBody {
  error: string;
  fields?: Record<string, string>;
  requestId?: string;
}
