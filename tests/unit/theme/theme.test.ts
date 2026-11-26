import { afterEach, describe, expect, it, vi } from "vitest";
import {
  parseThemePreference,
  storedValueFor,
  THEME_ATTRIBUTE,
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

const runInitScript = () => new Function(THEME_INIT_SCRIPT)();

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  vi.restoreAllMocks();
});

describe("parseThemePreference / storedValueFor", () => {
  it.each([
    ["light", "light"],
    ["dark", "dark"],
    ["system", "system"],
    [null, "system"],
    ["", "system"],
    ["DARK", "system"],
    ['"dark"', "system"],
    [42, "system"],
  ])("%j → %s", (value, expected) => {
    expect(parseThemePreference(value)).toBe(expected);
  });

  it("stores only an explicit choice", () => {
    expect(storedValueFor("light")).toBe("light");
    expect(storedValueFor("dark")).toBe("dark");
    expect(storedValueFor("system")).toBeNull();
  });
});

describe("THEME_INIT_SCRIPT (runs in <head> before the first paint)", () => {
  it("applies a stored light or dark theme", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    runInitScript();
    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe("dark");
  });

  it("leaves the page on the system theme for missing or unexpected values", () => {
    runInitScript();
    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
    localStorage.setItem(THEME_STORAGE_KEY, "<script>");
    runInitScript();
    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it("never throws when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(runInitScript).not.toThrow();
    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });
});
