/** 8-bit sRGB colour, each channel 0–255 (gamma-encoded, as stored in images and canvases). */
export type Rgb255 = { r: number; g: number; b: number };

/** Linear-light RGB in the sRGB primaries, each channel 0–1 (gamma removed). */
export type LinearRgb = { r: number; g: number; b: number };

/** CIE 1931 XYZ, relative to D65, scaled so that the D65 white has Y = 1. */
export type Xyz = { x: number; y: number; z: number };

/** CIELAB (D65 reference white). L* is 0–100; a* and b* are unbounded (skin: roughly 0–30). */
export type Lab = { L: number; a: number; b: number };
