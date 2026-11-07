/**
 * Colour engine (README §6.4): pure, dependency-free conversions
 * sRGB (0–255) → linear RGB → CIE XYZ (D65) → CIELAB (D65), plus chroma, hue angle and ITA°.
 */
export * from "./constants";
export { chroma, hueAngle, ita } from "./derived";
export { srgbToLab, xyzToLab } from "./lab";
export { linearChannelToSrgb, linearToSrgb, srgbChannelToLinear, srgbToLinear } from "./srgb";
export type { Lab, LinearRgb, Rgb255, Xyz } from "./types";
export { linearRgbToXyz } from "./xyz";
