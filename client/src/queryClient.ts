import { QueryClient } from "@tanstack/react-query";

export function shouldRetry(failureCount: number, error: unknown): boolean {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 0;
  if (status >= 400 && status < 500) return false;
  return failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: shouldRetry },
    mutations: { retry: false },
  },
});
