import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import App from "./App";

it("shows the app's name as the page heading", () => {
  render(<App />);
  expect(
    screen.getByRole("heading", {
      level: 1,
      name: "Job Applications Tracker",
    }),
  ).toBeTruthy();
});
