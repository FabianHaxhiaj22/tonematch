import { SRGB_TO_XYZ_D65 } from "./constants";
import type { LinearRgb, Xyz } from "./types";

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
