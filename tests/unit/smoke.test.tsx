import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

// M0 tooling check: proves Vitest, jsdom, the React transform and jest-dom matchers are wired up.
// Real tests arrive with each feature (M1: src/lib/color).
describe("test tooling", () => {
  it("runs TypeScript tests", () => {
    expect(1 + 1).toBe(2);
  });

  it("renders React components in jsdom", () => {
    render(<p>ToneMatch</p>);
    expect(screen.getByText("ToneMatch")).toBeInTheDocument();
  });
});
