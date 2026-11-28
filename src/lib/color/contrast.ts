import { WCAG_CONTRAST_FLARE, WCAG_LUMINANCE_WEIGHTS } from "./constants";
import { hexToRgb } from "./hex";
import { srgbChannelToLinear } from "./srgb";
import type { Rgb255 } from "./types";

/**
 * WCAG 2.2 colour contrast (SPEC §13: AA target). Used to check the design tokens in
 * `src/app/globals.css` (tests/unit/design/tokens.test.ts) so a palette change can't silently
 * break contrast. https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio
 */

/** WCAG relative luminance (0 = black, 1 = white) of an sRGB colour. */
export function relativeLuminance({ r, g, b }: Rgb255): number {
  const w = WCAG_LUMINANCE_WEIGHTS;
  return w.r * srgbChannelToLinear(r) + w.g * srgbChannelToLinear(g) + w.b * srgbChannelToLinear(b);
}

/** WCAG contrast ratio between two colours, 1 (none) … 21 (black on white). Order doesn't matter. */
export function contrastRatio(a: Rgb255 | string, b: Rgb255 | string): number {
  const la = relativeLuminance(typeof a === "string" ? hexToRgb(a) : a);
  const lb = relativeLuminance(typeof b === "string" ? hexToRgb(b) : b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + WCAG_CONTRAST_FLARE) / (lo + WCAG_CONTRAST_FLARE);
}
