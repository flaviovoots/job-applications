import { waitFor } from "@testing-library/react";
import { expect, vi } from "vitest";

// The window.google stub that setup.ts gives each test.
export function googleStub() {
  const google = window.google;
  if (!google) throw new Error("setup.ts didn't stub window.google");
  return google;
}

// Waits until GoogleButton has rendered Google's button into an element inside
// container.
export async function waitForGoogleButton(container: HTMLElement) {
  await waitFor(() => {
    const { renderButton } = googleStub().accounts.id;
    const parent = vi.mocked(renderButton).mock.lastCall?.[0] ?? null;
    expect(container.contains(parent)).toBe(true);
  });
}
