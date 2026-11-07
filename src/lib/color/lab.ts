import { CIE_EPSILON, CIE_KAPPA, D65_WHITE } from "./constants";
import { srgbToLinear } from "./srgb";
import type { Lab, Rgb255, Xyz } from "./types";
import { linearRgbToXyz } from "./xyz";

/**
 * CIELAB companding function (CIE 15:2004):
 *
 *   f(t) = ∛t                  if t > ε   (ε = 216/24389)
 *   f(t) = (κ·t + 16) / 116    otherwise  (κ = 24389/27)
 */
function labF(t: number): number {
  return t > CIE_EPSILON ? Math.cbrt(t) : (CIE_KAPPA * t + 16) / 116;
}

/**
 * CIE XYZ → CIELAB, relative to a reference white (default D65):
 *
 *   fx = f(X / Xn),  fy = f(Y / Yn),  fz = f(Z / Zn)
 *   L* = 116·fy − 16
 *   a* = 500·(fx − fy)
 *   b* = 200·(fy − fz)
 */
export function xyzToLab({ x, y, z }: Xyz, white: Xyz = D65_WHITE): Lab {
  const fx = labF(x / white.x);
  const fy = labF(y / white.y);
  const fz = labF(z / white.z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** Full pipeline: sRGB (0–255) → linear RGB → XYZ (D65) → CIELAB (D65). */
export function srgbToLab(rgb: Rgb255): Lab {
  return xyzToLab(linearRgbToXyz(srgbToLinear(rgb)));
}
