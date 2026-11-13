/**
 * Image helpers for analysis. `RgbaImage` matches the shape of the DOM's ImageData, so pure code
 * here never touches canvas APIs (and tests can build images in memory).
 */
import { CHANNEL_MAX, srgbChannelToLinear } from "@/lib/color";
import type { Polygon } from "./geometry";

export type RgbaImage = {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel, row-major. Alpha is ignored. */
  data: Uint8ClampedArray | Uint8Array;
};

/** Rec. 709 luma weights (on gamma-encoded values, 0–255). */
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;

export function lumaAt(img: RgbaImage, pixel: number): number {
  const o = pixel * 4;
  return LUMA_R * img.data[o]! + LUMA_G * img.data[o + 1]! + LUMA_B * img.data[o + 2]!;
}

/** sRGB (0–255) → linear lookup table; avoids pow() per pixel. */
export const SRGB_TO_LINEAR_LUT: Float64Array = (() => {
  const lut = new Float64Array(CHANNEL_MAX + 1);
  for (let v = 0; v <= CHANNEL_MAX; v++) lut[v] = srgbChannelToLinear(v);
  return lut;
})();

/**
 * Indices (y·width + x) of the pixels whose **centres** lie inside `poly` (even-odd rule),
 * in row-major order. Scanline rasterisation over the polygon's bounding box only.
 */
export function rasterizePolygon(poly: Polygon, width: number, height: number): Uint32Array {
  if (poly.length < 3) return new Uint32Array(0);
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of poly) {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const y0 = Math.max(0, Math.ceil(minY - 0.5));
  const y1 = Math.min(height - 1, Math.floor(maxY - 0.5));
  const out: number[] = [];
  const xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    xs.length = 0;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]!;
      const b = poly[j]!;
      // Half-open rule (a.y > cy) !== (b.y > cy) counts each crossing once.
      if (a.y > cy !== b.y > cy) xs.push(a.x + ((cy - a.y) * (b.x - a.x)) / (b.y - a.y));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const xa = Math.max(0, Math.ceil(xs[k]! - 0.5));
      const xb = Math.min(width - 1, Math.ceil(xs[k + 1]! - 0.5) - 1);
      for (let x = xa; x <= xb; x++) out.push(y * width + x);
    }
  }
  return Uint32Array.from(out);
}

/** A 0/1 mask (one byte per pixel) from pixel indices. */
export function maskFromIndices(indices: Uint32Array, width: number, height: number): Uint8Array {
  const mask = new Uint8Array(width * height);
  for (const i of indices) mask[i] = 1;
  return mask;
}
