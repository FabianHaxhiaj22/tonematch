import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { useLocaleStore } from "@/store/locale";

beforeEach(() => {
  act(() => useLocaleStore.getState().setLocale("en"));
  document.documentElement.lang = "en";
});

describe("LanguageSwitch", () => {
  it("is a labelled group of two toggle buttons, English pressed", () => {
    render(<LanguageSwitch />);
    expect(screen.getByRole("group", { name: "Language" })).toBeInTheDocument();
    const en = screen.getByRole("button", { name: /English/ });
    const sq = screen.getByRole("button", { name: /Shqip/ });
    expect(en).toHaveAttribute("aria-pressed", "true");
    expect(sq).toHaveAttribute("aria-pressed", "false");
    // WCAG 2.5.3: the accessible name contains the visible label.
    expect(en).toHaveAccessibleName(/^EN\s+English$/);
    expect(sq).toHaveAttribute("lang", "sq");
  });

  it("switches the store and <html lang>, and relabels itself", () => {
    render(<LanguageSwitch />);
    fireEvent.click(screen.getByRole("button", { name: /Shqip/ }));
    expect(useLocaleStore.getState().locale).toBe("sq");
    expect(document.documentElement.lang).toBe("sq");
    expect(screen.getByRole("group", { name: "Gjuha" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Shqip/ })).toHaveAttribute("aria-pressed", "true");
  });
});
