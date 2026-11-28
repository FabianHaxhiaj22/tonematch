/**
 * Colour engine (SPEC §6.4): pure, dependency-free conversions
 * sRGB (0–255) → linear RGB → CIE XYZ (D65) → CIELAB (D65), and back (labToSrgb, for display),
 * plus chroma, hue angle and ITA°.
 */
export * from "./constants";
export { contrastRatio, relativeLuminance } from "./contrast";
export { chroma, hueAngle, ita } from "./derived";
export { hexToRgb, rgbToHex } from "./hex";
export { inSrgbGamut, labToSrgb, labToXyz, srgbToLab, xyzToLab } from "./lab";
export { linearChannelToSrgb, linearToSrgb, srgbChannelToLinear, srgbToLinear } from "./srgb";
export type { Lab, LinearRgb, Rgb255, Xyz } from "./types";
export { invert3, linearRgbToXyz, XYZ_D65_TO_SRGB, xyzToLinearRgb } from "./xyz";
