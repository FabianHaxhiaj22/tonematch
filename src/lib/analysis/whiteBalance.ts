/**
 * White-paper calibration (README §6.3). The user taps a white sheet of paper; we average the
 * linear RGB of a small patch there and compute per-channel gains that make it neutral.
 * Uncalibrated mode applies no correction (gray-world distorts skin); casts are only detected
 * (quality.ts) and lower confidence.
 */
import type { LinearRgb } from "@/lib/color";
import {
  CLIP_BRIGHT_LEVEL,
  WB_MAX_CLIPPED_FRACTION,
  WB_MAX_GAIN,
  WB_MIN_GAIN,
  WB_MIN_PATCH_LUMINANCE,
  WB_PATCH_RADIUS,
} from "./config";
import { SRGB_TO_LINEAR_LUT, type RgbaImage } from "./image";

export type WhiteBalanceGains = { r: number; g: number; b: number };

export type PatchResult =
  | { ok: true; gains: WhiteBalanceGains; patchMean: LinearRgb; pixels: number }
  | {
      ok: false;
      reason: "OUTSIDE_IMAGE" | "TOO_DARK" | "CLIPPED" | "GAINS_OUT_OF_RANGE";
      patchMean?: LinearRgb;
    };

/** Relative luminance weights for linear sRGB (Rec. 709 / sRGB primaries). */
const Y_R = 0.2126;
const Y_G = 0.7152;
const Y_B = 0.0722;

/**
 * Measure a square patch centred on (x, y) (image pixels; clipped to the image) and compute
 * gains that map its mean to a neutral grey **of the same luminance**, so overall brightness
 * doesn't change.
 */
export function measureWhitePatch(
  img: RgbaImage,
  x: number,
  y: number,
  radius: number = WB_PATCH_RADIUS,
): PatchResult {
  const cx = Math.round(x);
  const cy = Math.round(y);
  if (cx < 0 || cy < 0 || cx >= img.width || cy >= img.height) {
    return { ok: false, reason: "OUTSIDE_IMAGE" };
  }
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  let clipped = 0;
  for (let py = Math.max(0, cy - radius); py <= Math.min(img.height - 1, cy + radius); py++) {
    for (let px = Math.max(0, cx - radius); px <= Math.min(img.width - 1, cx + radius); px++) {
      const o = (py * img.width + px) * 4;
      const R = img.data[o]!;
      const G = img.data[o + 1]!;
      const B = img.data[o + 2]!;
      if (R >= CLIP_BRIGHT_LEVEL || G >= CLIP_BRIGHT_LEVEL || B >= CLIP_BRIGHT_LEVEL) clipped++;
      r += SRGB_TO_LINEAR_LUT[R]!;
      g += SRGB_TO_LINEAR_LUT[G]!;
      b += SRGB_TO_LINEAR_LUT[B]!;
      n++;
    }
  }
  const patchMean = { r: r / n, g: g / n, b: b / n };
  if (clipped / n > WB_MAX_CLIPPED_FRACTION) return { ok: false, reason: "CLIPPED", patchMean };
  const Y = Y_R * patchMean.r + Y_G * patchMean.g + Y_B * patchMean.b;
  if (Y < WB_MIN_PATCH_LUMINANCE) return { ok: false, reason: "TOO_DARK", patchMean };
  const gains = { r: Y / patchMean.r, g: Y / patchMean.g, b: Y / patchMean.b };
  const inRange = (k: number) => Number.isFinite(k) && k >= WB_MIN_GAIN && k <= WB_MAX_GAIN;
  if (!inRange(gains.r) || !inRange(gains.g) || !inRange(gains.b)) {
    return { ok: false, reason: "GAINS_OUT_OF_RANGE", patchMean };
  }
  return { ok: true, gains, patchMean, pixels: n };
}

/** Apply gains to a linear RGB colour, clamped to [0, 1] (stays inside the sRGB gamut). */
export function applyGains(c: LinearRgb, k: WhiteBalanceGains): LinearRgb {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  return { r: clamp(c.r * k.r), g: clamp(c.g * k.g), b: clamp(c.b * k.b) };
}
