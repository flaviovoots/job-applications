import { markSignedOut } from "./session";

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly fields: Record<string, string> | undefined;
  readonly requestId: string | undefined;

  constructor(
    status: number,
    error: string,
    fields?: Record<string, string>,
    requestId?: string,
  ) {
    super(error);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
    this.fields = fields;
    this.requestId = requestId;
  }
}

// The server's error shape: { error, fields?, requestId }.
interface ErrorBody {
  error: string;
  fields?: Record<string, string>;
  requestId?: string;
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

// Status 0 means the app never answered: the network failed, or something
// else did (Render's loading page, a proxy error page).
function unreachable(): ApiError {
  return new ApiError(0, "Couldn't reach the server. Try again.");
}

export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: ApiFetchOptions = {},
): Promise<T> {
  // POST and PATCH always carry JSON, so the write guard never answers 415.
  const sendsBody =
    body !== undefined || method === "POST" || method === "PATCH";

  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: sendsBody ? { "Content-Type": "application/json" } : {},
      body: sendsBody ? JSON.stringify(body ?? {}) : undefined,
    });
  } catch {
    throw unreachable();
  }

  if (res.status === 204) return undefined as T;

  const isJson =
    res.headers.get("Content-Type")?.startsWith("application/json") ?? false;
  if (!isJson) throw unreachable();

  const data: unknown = await res.json().catch(() => {
    throw unreachable();
  });

  if (!res.ok) {
    // A 401 from /api/* means the session ended. One from /auth/* (a refused
    // sign-in) says nothing about the current session.
    if (res.status === 401 && path.startsWith("/api/")) markSignedOut();
    const { error, fields, requestId } = data as ErrorBody;
    throw new ApiError(res.status, error, fields, requestId);
  }
  return data as T;
}
