import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { queryClient } from "../queryClient";

// Renders ui inside the providers main.tsx gives the app: the shared query
// client (setup.ts clears it after each test), and a router that starts at
// url instead of the browser's address.
export function renderWithProviders(
  ui: ReactElement,
  { url = "/" }: { url?: string } = {},
) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
