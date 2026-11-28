import { CHANNEL_MAX, CIE_EPSILON, CIE_KAPPA, D65_WHITE, SRGB_GAMUT_TOLERANCE } from "./constants";
import { linearToSrgb, srgbToLinear } from "./srgb";
import type { Lab, Rgb255, Xyz } from "./types";
import { linearRgbToXyz, xyzToLinearRgb } from "./xyz";

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

/**
 * CIELAB → CIE XYZ, relative to a reference white (default D65). Inverse of {@link xyzToLab}
 * (CIE 15:2004; Lindbloom, "Lab to XYZ"):
 *
 *   fy = (L* + 16) / 116,  fx = fy + a* / 500,  fz = fy − b* / 200
 *   X/Xn = fx³ if fx³ > ε, else (116·fx − 16) / κ      (same for Z with fz)
 *   Y/Yn = fy³ if L* > κ·ε, else L* / κ
 */
export function labToXyz({ L, a, b }: Lab, white: Xyz = D65_WHITE): Xyz {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > CIE_EPSILON ? t ** 3 : (116 * t - 16) / CIE_KAPPA);
  const yr = L > CIE_KAPPA * CIE_EPSILON ? fy ** 3 : L / CIE_KAPPA;
  return { x: inv(fx) * white.x, y: yr * white.y, z: inv(fz) * white.z };
}

/**
 * Full inverse pipeline: CIELAB (D65) → XYZ → linear RGB → sRGB (0–255 per channel, not rounded
 * and not clamped), so that `labToSrgb(srgbToLab(c))` gives `c` back. Used to show a sampled
 * skin colour on screen (results swatch, M6b-2): format it with `rgbToHex`, which clamps, and
 * check {@link inSrgbGamut} first if it matters whether the colour fits.
 */
export function labToSrgb(lab: Lab): Rgb255 {
  return linearToSrgb(xyzToLinearRgb(labToXyz(lab)));
}

/** True when every channel is within 0–255 (allowing for floating-point error). */
export function inSrgbGamut({ r, g, b }: Rgb255): boolean {
  const ok = (v: number) => v >= -SRGB_GAMUT_TOLERANCE && v <= CHANNEL_MAX + SRGB_GAMUT_TOLERANCE;
  return ok(r) && ok(g) && ok(b);
}
