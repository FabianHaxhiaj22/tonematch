import { CHANNEL_MAX } from "./constants";
import type { Rgb255 } from "./types";

const HEX = /^#?([0-9a-f]{6})$/i;

/** Parse `#rrggbb` (the `#` is optional, case-insensitive). Throws on anything else. */
export function hexToRgb(hex: string): Rgb255 {
  const m = HEX.exec(hex.trim());
  if (!m) throw new Error(`Not a #rrggbb colour: "${hex}"`);
  const n = Number.parseInt(m[1]!, 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** One channel → two hex digits: clamped to 0–255 and rounded to the nearest 8-bit value. */
function channelHex(value: number): string {
  const v = Math.round(Math.min(CHANNEL_MAX, Math.max(0, value)));
  return v.toString(16).padStart(2, "0");
}

/**
 * Format an sRGB colour as `#rrggbb` (lowercase). Channels outside 0–255 (an out-of-gamut colour
 * converted from CIELAB) are clamped, so the result is always a valid CSS colour.
 */
export function rgbToHex({ r, g, b }: Rgb255): string {
  return `#${channelHex(r)}${channelHex(g)}${channelHex(b)}`;
}
