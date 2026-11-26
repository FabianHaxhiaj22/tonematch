import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/features/theme/ThemeToggle";
import { resetThemeStoreForTests } from "@/features/theme/themeStore";
import { THEME_ATTRIBUTE, THEME_STORAGE_KEY } from "@/lib/theme";
import { useLocaleStore } from "@/store/locale";

const html = document.documentElement;
const button = () => screen.getByRole("button", { name: /^Theme:/ });

beforeEach(() => {
  localStorage.clear();
  html.removeAttribute(THEME_ATTRIBUTE);
  resetThemeStoreForTests();
  act(() => useLocaleStore.getState().setLocale("en"));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ThemeToggle", () => {
  it("starts on System, collapsed, with nothing stored", () => {
    render(<ThemeToggle />);
    expect(button()).toHaveAccessibleName("Theme: System");
    expect(button()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("opens a labelled group of three radios; choosing Dark applies and remembers it", () => {
    render(<ThemeToggle />);
    fireEvent.click(button());
    expect(button()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "System" })).toBeChecked();

    fireEvent.click(screen.getByRole("radio", { name: "Dark" }));
    expect(html.getAttribute(THEME_ATTRIBUTE)).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(button()).toHaveAccessibleName("Theme: Dark");
  });

  it("choosing System removes the attribute and the stored value", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    html.setAttribute(THEME_ATTRIBUTE, "light");
    render(<ThemeToggle />);
    expect(button()).toHaveAccessibleName("Theme: Light");
    fireEvent.click(button());
    fireEvent.click(screen.getByRole("radio", { name: "System" }));
    expect(html.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it("closes on Escape and returns focus to the button", () => {
    render(<ThemeToggle />);
    fireEvent.click(button());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(button()).toHaveFocus();
  });

  it("closes on a click outside", () => {
    render(
      <>
        <ThemeToggle />
        <p>outside</p>
      </>,
    );
    fireEvent.click(button());
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("stays open when focus goes nowhere (clicking a label), closes when it moves outside", () => {
    render(
      <>
        <ThemeToggle />
        <a href="#next">next</a>
      </>,
    );
    fireEvent.click(button());
    fireEvent.blur(button(), { relatedTarget: null });
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    fireEvent.blur(screen.getByRole("radio", { name: "Dark" }), {
      relatedTarget: screen.getByRole("link", { name: "next" }),
    });
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  it("follows a change made in another tab", () => {
    render(<ThemeToggle />);
    act(() => {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      window.dispatchEvent(
        new StorageEvent("storage", { key: THEME_STORAGE_KEY, newValue: "dark" }),
      );
    });
    expect(html.getAttribute(THEME_ATTRIBUTE)).toBe("dark");
    expect(button()).toHaveAccessibleName("Theme: Dark");
  });

  it("still applies a choice when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    render(<ThemeToggle />);
    fireEvent.click(button());
    fireEvent.click(screen.getByRole("radio", { name: "Light" }));
    expect(html.getAttribute(THEME_ATTRIBUTE)).toBe("light");
    expect(button()).toHaveAccessibleName("Theme: Light");
  });

  it("speaks Albanian", () => {
    act(() => useLocaleStore.getState().setLocale("sq"));
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Tema: Sipas sistemit" })).toBeInTheDocument();
  });
});
