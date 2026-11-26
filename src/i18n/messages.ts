/**
 * UI messages (SPEC §13): `messages/en.json` and `messages/sq.json`, in next-intl's nested
 * format, so M8 can hand them to next-intl unchanged. Until then this tiny typed lookup is used.
 * Placeholders use next-intl's `{name}` syntax (plain substitution only; no plurals yet).
 * Albanian strings are drafts until reviewed: see `review/sq.json`.
 */
import en from "./messages/en.json";
import sq from "./messages/sq.json";

export const LOCALES = ["en", "sq"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export type Messages = typeof en;

/** Dotted paths to every string in the message tree, e.g. "quiz.questions.veins.prompt". */
type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];
export type MessageKey = Paths<Messages>;

// sq must have exactly en's shape; the compiler checks it here and a test checks the keys.
const CATALOG: Record<Locale, Messages> = { en, sq };

export function getMessage(
  locale: Locale,
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  let node: unknown = CATALOG[locale];
  for (const part of key.split(".")) node = (node as Record<string, unknown>)[part];
  if (typeof node !== "string") throw new Error(`Missing message "${key}" for locale "${locale}"`);
  return values ? node.replace(/\{(\w+)\}/g, (m, name: string) => String(values[name] ?? m)) : node;
}

/** A `t(key, values)` bound to one locale. */
export function translator(locale: Locale) {
  return (key: MessageKey, values?: Record<string, string | number>) =>
    getMessage(locale, key, values);
}

/** Flatten a message tree to dotted keys (used by tests and the review list). */
export function flattenMessages(tree: object, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flattenMessages(v as object, key));
  }
  return out;
}
