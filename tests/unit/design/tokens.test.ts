import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/color";

/**
 * Guards the Atelier palette in src/app/globals.css (D-034): every pair used for text or
 * controls must meet WCAG 2.2 AA in both themes (SPEC §13), so a token edit can't quietly break
 * contrast. Decorative tokens (line, gold-a, gold-b) carry no meaning and aren't checked.
 */
// Vitest runs from the repo root (jsdom makes import.meta.url a non-file URL).
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const DARK_MARKER = "@media (prefers-color-scheme: dark)";

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--tm-([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

const darkStart = css.indexOf(DARK_MARKER);
const THEMES = {
  light: tokens(css.slice(0, darkStart)),
  dark: tokens(css.slice(darkStart, css.indexOf("@theme"))),
};

const TEXT = 4.5; // AA, normal-size text
const NON_TEXT = 3; // AA, focus indicators and control boundaries (1.4.11)

// [foreground, background, minimum, where it's used]
const PAIRS: [string, string, number, string][] = [
  ["ink", "bg", TEXT, "body text"],
  ["ink", "surface", TEXT, "text on cards"],
  ["ink", "sunken", TEXT, "text on bands"],
  ["muted", "bg", TEXT, "secondary text"],
  ["muted", "surface", TEXT, "secondary text on cards"],
  ["muted", "sunken", TEXT, "secondary text on bands"],
  ["accent", "bg", TEXT, "accent text and links"],
  ["accent", "surface", TEXT, "accent text on cards"],
  ["accent", "sunken", TEXT, "accent text on bands"],
  ["on-ink", "ink", TEXT, "primary button label"],
  ["focus", "bg", NON_TEXT, "focus ring"],
  ["focus", "surface", NON_TEXT, "focus ring on cards"],
  ["focus", "sunken", NON_TEXT, "focus ring on bands"],
  ["muted", "surface", NON_TEXT, "control borders"],
];

describe("design tokens (globals.css)", () => {
  it("defines the same tokens for light and dark", () => {
    expect(Object.keys(THEMES.light).length).toBeGreaterThanOrEqual(11);
    expect(Object.keys(THEMES.dark).sort()).toEqual(Object.keys(THEMES.light).sort());
  });

  for (const [theme, t] of Object.entries(THEMES)) {
    it.each(PAIRS)(`${theme}: %s on %s ≥ %f (%s)`, (fg, bg, min) => {
      expect(t[fg], `--tm-${fg}`).toBeDefined();
      expect(t[bg], `--tm-${bg}`).toBeDefined();
      expect(contrastRatio(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(min);
    });
  }
});
