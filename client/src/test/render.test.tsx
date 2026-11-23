import { useQueryClient } from "@tanstack/react-query";
import { screen } from "@testing-library/react";
import { useLocation } from "react-router";
import { describe, expect, it } from "vitest";
import { queryClient } from "../queryClient";
import { renderWithProviders } from "./render";

function Probe() {
  const { pathname, search } = useLocation();
  const client = useQueryClient() === queryClient ? "shared" : "other";
  return <p>{`${pathname}${search} ${client} client`}</p>;
}

describe("renderWithProviders", () => {
  it("uses the shared query client and starts the router at /", () => {
    renderWithProviders(<Probe />);
    expect(screen.getByText("/ shared client")).toBeTruthy();
  });

  it("starts the router at the given url", () => {
    renderWithProviders(<Probe />, { url: "/applications?status=applied" });
    expect(
      screen.getByText("/applications?status=applied shared client"),
    ).toBeTruthy();
  });
});
