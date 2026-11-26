/**
 * Colour theme preference (D-037). "system" follows `prefers-color-scheme`; "light" and "dark"
 * override it via `<html data-theme>`. Only an explicit choice is stored (localStorage, this key);
 * "system" removes the key, so by default nothing is stored at all.
 */

export const THEMES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];

/** localStorage key. Holds "light" or "dark" only; absent means "system". */
export const THEME_STORAGE_KEY = "tm-theme";

/** Attribute on <html> that forces a theme; absent means follow the system. */
export const THEME_ATTRIBUTE = "data-theme";

/** Read a stored value defensively: anything but "light"/"dark" means "system". */
export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/** The value to store for a preference: null means "remove the key". */
export function storedValueFor(preference: ThemePreference): "light" | "dark" | null {
  return preference === "system" ? null : preference;
}

/**
 * Inline script for <head>, run before the first paint so a stored theme never flashes the wrong
 * colours. Self-contained (no imports), and silent if storage is blocked (private mode, disabled
 * cookies): the page then simply follows the system.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute(${JSON.stringify(
  THEME_ATTRIBUTE,
)},t)}catch(e){}})()`;
