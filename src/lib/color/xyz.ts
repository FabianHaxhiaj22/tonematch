import { SRGB_TO_XYZ_D65 } from "./constants";
import type { LinearRgb, Xyz } from "./types";

type Matrix3 = readonly [
  readonly [number, number, number],
  readonly [number, number, number],
  readonly [number, number, number],
];

const [ROW_X, ROW_Y, ROW_Z] = SRGB_TO_XYZ_D65;

/**
 * Linear sRGB (0–1) → CIE XYZ relative to D65 (white has Y = 1):
 *
 *   [X]   [0.4124564  0.3575761  0.1804375] [R]
 *   [Y] = [0.2126729  0.7151522  0.0721750] [G]
 *   [Z]   [0.0193339  0.1191920  0.9503041] [B]
 */
export function linearRgbToXyz({ r, g, b }: LinearRgb): Xyz {
  return {
    x: ROW_X[0] * r + ROW_X[1] * g + ROW_X[2] * b,
    y: ROW_Y[0] * r + ROW_Y[1] * g + ROW_Y[2] * b,
    z: ROW_Z[0] * r + ROW_Z[1] * g + ROW_Z[2] * b,
  };
}

/** Inverse of a 3 × 3 matrix (adjugate / determinant). Throws if it isn't invertible. */
export function invert3(m: Matrix3): Matrix3 {
  const [[a, b, c], [d, e, f], [g, h, i]] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (det === 0 || !Number.isFinite(det)) throw new Error("invert3: matrix is not invertible");
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

/**
 * CIE XYZ (D65) → linear sRGB. The matrix is the exact inverse of SRGB_TO_XYZ_D65, computed
 * here rather than copied from a table: a published inverse is rounded to 7 decimals, which
 * would stop {@link linearRgbToXyz} and this function from undoing each other exactly.
 * (It matches Lindbloom's published inverse, 3.2404542 −1.5371385 −0.4985314 …, to 1e-6.)
 */
export const XYZ_D65_TO_SRGB: Matrix3 = invert3(SRGB_TO_XYZ_D65);

const [INV_R, INV_G, INV_B] = XYZ_D65_TO_SRGB;

/**
 * CIE XYZ (D65) → linear sRGB. Not clamped: a colour outside the sRGB gamut gets channels below
 * 0 or above 1 (callers decide how to show it, e.g. `rgbToHex` clamps).
 */
export function xyzToLinearRgb({ x, y, z }: Xyz): LinearRgb {
  return {
    r: INV_R[0] * x + INV_R[1] * y + INV_R[2] * z,
    g: INV_G[0] * x + INV_G[1] * y + INV_G[2] * z,
    b: INV_B[0] * x + INV_B[1] * y + INV_B[2] * z,
  };
}
