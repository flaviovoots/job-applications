import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";
import { queryClient } from "../queryClient";

beforeEach(() => {
  const defaults = queryClient.getDefaultOptions();
  queryClient.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  });
  // jsdom doesn't load Google's script. Fresh mocks in each test, so call
  // counts don't pass from one test to the next.
  window.google = {
    accounts: { id: { initialize: vi.fn(), renderButton: vi.fn() } },
  };
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  delete window.google;
  // GoogleButton sets this when it mounts before the library has loaded.
  delete window.onGoogleLibraryLoad;
});
