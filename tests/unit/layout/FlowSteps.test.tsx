import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { FlowSteps } from "@/components/layout/FlowSteps";
import { useLocaleStore } from "@/store/locale";

beforeEach(() => act(() => useLocaleStore.getState().setLocale("en")));

const nav = () => screen.getByRole("navigation", { name: "Steps" });

describe("FlowSteps", () => {
  it("lists Photo · Questions · Result in order", () => {
    render(<FlowSteps current="photo" />);
    const items = within(nav()).getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual(["1. Photo", "2. Questions", "3. Result"]);
  });

  it("marks the current step with aria-current and links only to earlier steps", () => {
    render(<FlowSteps current="questions" />);
    const current = within(nav()).getByText("Questions").closest("[aria-current]");
    expect(current).toHaveAttribute("aria-current", "step");
    expect(within(nav()).getByRole("link", { name: "1. Photo" })).toHaveAttribute(
      "href",
      "/analyze",
    );
    expect(within(nav()).queryByRole("link", { name: /Result/ })).toBeNull();
    expect(within(nav()).getAllByRole("link")).toHaveLength(1);
  });

  it("on the result step, both earlier steps are links back", () => {
    render(<FlowSteps current="result" />);
    const links = within(nav()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/analyze", "/quiz"]);
  });

  it("on the first step nothing is a link", () => {
    render(<FlowSteps current="photo" />);
    expect(within(nav()).queryAllByRole("link")).toHaveLength(0);
  });

  it("keeps the names of other steps for screen readers on phones (sr-only, shown from sm)", () => {
    render(<FlowSteps current="result" />);
    expect(within(nav()).getByText("Photo")).toHaveClass("sr-only", "sm:not-sr-only");
    expect(within(nav()).getByText("Result")).not.toHaveClass("sr-only");
  });

  it("follows the interface language", () => {
    render(<FlowSteps current="result" />);
    act(() => useLocaleStore.getState().setLocale("sq"));
    expect(screen.getByRole("navigation", { name: "Hapat" })).toBeInTheDocument();
    expect(screen.getByText("Rezultati")).toBeInTheDocument();
  });
});
