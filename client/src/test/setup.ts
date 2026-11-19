import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { queryClient } from "../queryClient";

beforeEach(() => {
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
});

afterEach(() => {
  cleanup();
  queryClient.clear();
});
