/**
 * Colour-science constants. These are published standards, not tunable thresholds, so they live
 * here rather than in src/lib/analysis/config.ts.
 *
 * Sources:
 * - sRGB transfer function and primaries: IEC 61966-2-1:1999.
 * - RGB→XYZ matrix and D65 white: Bruce Lindbloom, "RGB/XYZ Matrices" (sRGB, D65), 7 decimal places
 *   as published, http://www.brucelindbloom.com/index.html?Eqn_RGB_XYZ_Matrix.html
 * - CIELAB ε and κ: CIE 15:2004, exact rational forms as recommended by Lindbloom,
 *   http://www.brucelindbloom.com/index.html?LContinuity.html
 *
 * The X and Z rows sum exactly to the D65 white below; the Y row sums to 1.0000001 because the
 * published values are rounded to 7 decimals. So sRGB white maps to Y = 1.0000001 and greys get
 * |a*| ≤ 1.7e-5 and |b*| ≤ 6.7e-6 (worst case at white): negligible, tens of thousands of times
 * below a just-noticeable difference. We keep the published values rather than inventing our own.
 */

/** sRGB encoded-value breakpoint between the linear segment and the power curve. */
export const SRGB_DECODE_BREAKPOINT = 0.04045;
/** Linear-light breakpoint (= SRGB_DECODE_BREAKPOINT / SRGB_LINEAR_SLOPE). */
export const SRGB_ENCODE_BREAKPOINT = 0.0031308;
/** Slope of the linear segment near black. */
export const SRGB_LINEAR_SLOPE = 12.92;
/** Offset and gamma of the power-curve segment: ((c + 0.055) / 1.055) ^ 2.4. */
export const SRGB_OFFSET = 0.055;
export const SRGB_GAMMA = 2.4;

/** Maximum 8-bit channel value. */
export const CHANNEL_MAX = 255;

/** Linear sRGB → XYZ (D65), row-major: [X; Y; Z] = M · [R; G; B]. */
export const SRGB_TO_XYZ_D65 = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
] as const;

/** D65 reference white in XYZ (Y = 1). Equals the row sums of SRGB_TO_XYZ_D65 to within 1e-7. */
export const D65_WHITE = { x: 0.95047, y: 1, z: 1.08883 } as const;

/** CIE ε = (6/29)^3: below this, the cube-root curve is replaced by a straight line. */
export const CIE_EPSILON = 216 / 24389;
/** CIE κ = (29/3)^3: slope of that straight line (in L* units). */
export const CIE_KAPPA = 24389 / 27;

/**
 * WCAG 2.2 relative luminance weights for linear R, G, B (the Y row of the sRGB matrix rounded
 * to 4 decimals, as the spec writes them). https://www.w3.org/TR/WCAG22/#dfn-relative-luminance
 */
export const WCAG_LUMINANCE_WEIGHTS = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;
/** WCAG contrast-ratio flare term: (L1 + 0.05) / (L2 + 0.05). */
export const WCAG_CONTRAST_FLARE = 0.05;

/**
 * Slack (in 0–255 channel units) when deciding whether a converted colour lies inside the sRGB
 * cube. Converting back from CIELAB carries floating-point error around 1e-12, so a colour that
 * started in sRGB must not be reported as out of gamut because of it. Far below one 8-bit step.
 */
export const SRGB_GAMUT_TOLERANCE = 1e-6;
