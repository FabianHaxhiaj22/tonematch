import type { Lab } from "./types";

const RAD_TO_DEG = 180 / Math.PI;

/** Chroma (colourfulness): C* = √(a*² + b*²). */
export function chroma({ a, b }: Lab): number {
  return Math.hypot(a, b);
}

/**
 * Hue angle in degrees, normalised to [0, 360): h° = atan2(b*, a*) · 180/π.
 *
 * For skin, higher h° means more yellow (warmer) and lower h° means more red/pink (cooler).
 * Hue is undefined for neutral greys (a* = b* = 0); this returns 0 in that case, so check
 * {@link chroma} first when it matters.
 */
export function hueAngle({ a, b }: Lab): number {
  const deg = Math.atan2(b, a) * RAD_TO_DEG;
  return deg < 0 ? deg + 360 : deg;
}

/**
 * Individual Typology Angle, used for skin depth (README §6.4, §6.5):
 *
 *   ITA° = atan((L* − 50) / b*) · 180/π
 *
 * **b* ≈ 0 guard:** the formula divides by b*, so when b* < `minB` this returns `null` instead of a
 * meaningless angle. Callers fall back to L* for depth and lower confidence. Skin b* is normally
 * clearly positive, so `null` mostly signals a bad sample. `minB` comes from the analysis config
 * (`ITA_MIN_B`); it must be a finite number > 0.
 */
export function ita({ L, b }: Lab, minB: number): number | null {
  if (!Number.isFinite(minB) || minB <= 0) {
    throw new RangeError(`ita: minB must be a finite number > 0, got ${minB}`);
  }
  if (!(b >= minB)) return null; // also catches NaN
  return Math.atan((L - 50) / b) * RAD_TO_DEG;
}
