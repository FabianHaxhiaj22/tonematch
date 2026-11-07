import {
  CHANNEL_MAX,
  SRGB_DECODE_BREAKPOINT,
  SRGB_ENCODE_BREAKPOINT,
  SRGB_GAMMA,
  SRGB_LINEAR_SLOPE,
  SRGB_OFFSET,
} from "./constants";
import type { LinearRgb, Rgb255 } from "./types";

/**
 * Decode one sRGB channel (0–255) to linear light (0–1). IEC 61966-2-1:
 *
 *   c = v / 255
 *   linear = c / 12.92                       if c ≤ 0.04045
 *   linear = ((c + 0.055) / 1.055) ^ 2.4     otherwise
 *
 * Values outside 0–255 are not clamped; callers pass pixel data, which is already in range.
 */
export function srgbChannelToLinear(value255: number): number {
  const c = value255 / CHANNEL_MAX;
  return c <= SRGB_DECODE_BREAKPOINT
    ? c / SRGB_LINEAR_SLOPE
    : ((c + SRGB_OFFSET) / (1 + SRGB_OFFSET)) ** SRGB_GAMMA;
}

/**
 * Encode one linear-light channel (0–1) back to sRGB (0–255, not rounded). Inverse of
 * {@link srgbChannelToLinear}:
 *
 *   c = 12.92 · linear                           if linear ≤ 0.0031308
 *   c = 1.055 · linear ^ (1 / 2.4) − 0.055       otherwise
 *   value = 255 · c
 */
export function linearChannelToSrgb(linear: number): number {
  const c =
    linear <= SRGB_ENCODE_BREAKPOINT
      ? linear * SRGB_LINEAR_SLOPE
      : (1 + SRGB_OFFSET) * linear ** (1 / SRGB_GAMMA) - SRGB_OFFSET;
  return c * CHANNEL_MAX;
}

/** Decode an sRGB colour (0–255 per channel) to linear RGB (0–1 per channel). */
export function srgbToLinear({ r, g, b }: Rgb255): LinearRgb {
  return { r: srgbChannelToLinear(r), g: srgbChannelToLinear(g), b: srgbChannelToLinear(b) };
}

/** Encode linear RGB (0–1) to sRGB (0–255 per channel, not rounded). */
export function linearToSrgb({ r, g, b }: LinearRgb): Rgb255 {
  return { r: linearChannelToSrgb(r), g: linearChannelToSrgb(g), b: linearChannelToSrgb(b) };
}
