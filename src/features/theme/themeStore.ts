/**
 * The current theme preference as a tiny external store for `useSyncExternalStore` (D-037).
 * Reads localStorage once, keeps the choice in memory (so it still works when storage is
 * blocked), applies it to <html data-theme>, and follows changes made in other tabs.
 */
import {
  parseThemePreference,
  storedValueFor,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

let current: ThemePreference | null = null;
const listeners = new Set<() => void>();

function readStored(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function apply(preference: ThemePreference): void {
  const root = document.documentElement;
  if (preference === "system") root.removeAttribute(THEME_ATTRIBUTE);
  else root.setAttribute(THEME_ATTRIBUTE, preference);
}

function emit(): void {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent): void {
  if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
  current = parseThemePreference(event.newValue);
  apply(current);
  emit();
}

export function getThemePreference(): ThemePreference {
  current ??= readStored();
  return current;
}

/** Before hydration the server can't know the stored value; it renders "system". */
export function getServerThemePreference(): ThemePreference {
  return "system";
}

export function subscribeThemePreference(listener: () => void): () => void {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

export function setThemePreference(preference: ThemePreference): void {
  current = preference;
  apply(preference);
  try {
    const value = storedValueFor(preference);
    if (value) localStorage.setItem(THEME_STORAGE_KEY, value);
    else localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    // Storage blocked: the choice still applies for this page view.
  }
  emit();
}

/** Tests only: forget the cached preference. */
export function resetThemeStoreForTests(): void {
  current = null;
}
