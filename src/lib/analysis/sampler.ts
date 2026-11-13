/**
 * Skin sampler (README §6.2): pixels inside each region → luminance trim → ΔE outlier removal
 * → median Lab per region → weighted overall median + left/right cheek disagreement.
 * Pure: takes an RgbaImage and pixel-space landmarks, returns numbers only.
 */
import { linearRgbToXyz, xyzToLab, type Lab } from "@/lib/color";
import {
  CHEEK_DISAGREEMENT_DELTA_E,
  LUMINANCE_TRIM_HIGH,
  LUMINANCE_TRIM_LOW,
  MIN_VALID_PIXELS,
  OUTLIER_DELTA_E,
  REGION_WEIGHTS,
  type RegionName,
} from "./config";
import { SRGB_TO_LINEAR_LUT, rasterizePolygon, type RgbaImage } from "./image";
import { REGION_NAMES, buildSampledRegions, type Point, type SampledRegions } from "./regions";
import { deltaE76, median, weightedMedian } from "./stats";
import { applyGains, type WhiteBalanceGains } from "./whiteBalance";

export type SamplerOptions = {
  /** White-balance gains from a calibration patch (README §6.3). Applied in linear RGB. */
  gains?: WhiteBalanceGains;
  lumTrimLow?: number;
  lumTrimHigh?: number;
  outlierDeltaE?: number;
  minValidPixels?: number;
};

export type RegionSample = {
  /** Pixels whose centres are inside the (clipped) polygon. */
  totalPixels: number;
  /** Pixels left after the luminance trim and the ΔE filter. */
  validPixels: number;
  /** Indices (y·width + x) of the valid pixels, e.g. for a debug overlay. */
  validIndices: Uint32Array;
  /** Median Lab of the valid pixels; null if there are none. */
  median: Lab | null;
  /** validPixels ≥ minValidPixels. */
  enough: boolean;
};

export type SkinSample = {
  regions: Record<RegionName, RegionSample>;
  /** Clipped polygons and face outline used for sampling. */
  geometry: SampledRegions;
  /** Weighted median over the valid pixels of regions with enough pixels; null if none. */
  overall: Lab | null;
  /** Regions below the minimum pixel count (lowers confidence). */
  lowPixelRegions: RegionName[];
  /** ΔE*ab between the cheek medians; null unless both cheeks have enough pixels. */
  cheekDeltaE: number | null;
  /**
   * The same difference split into lightness |ΔL*| and colour sqrt(Δa*² + Δb*²). Side light
   * mostly changes lightness; undertone (M4) depends on the colour part. Null like cheekDeltaE.
   */
  cheekDifference: { lightness: number; chromatic: number } | null;
  /** cheekDeltaE > CHEEK_DISAGREEMENT_DELTA_E (uneven lighting signal). */
  unevenLighting: boolean;
  /** Whether white-balance gains were applied. */
  calibrated: boolean;
};

/** Lab of one pixel, optionally white-balanced. */
export function pixelLab(img: RgbaImage, pixel: number, gains?: WhiteBalanceGains): Lab {
  const o = pixel * 4;
  let lin = {
    r: SRGB_TO_LINEAR_LUT[img.data[o]!]!,
    g: SRGB_TO_LINEAR_LUT[img.data[o + 1]!]!,
    b: SRGB_TO_LINEAR_LUT[img.data[o + 2]!]!,
  };
  if (gains) lin = applyGains(lin, gains);
  return xyzToLab(linearRgbToXyz(lin));
}

const medianLab = (labs: readonly Lab[]): Lab => ({
  L: median(labs.map((c) => c.L)),
  a: median(labs.map((c) => c.a)),
  b: median(labs.map((c) => c.b)),
});

/**
 * Filter and summarise the given pixels (README §6.2 steps 1–3). The median is per channel
 * (marginal median), which is robust and cheap; documented in DECISIONS D-020.
 */
export function sampleRegionPixels(
  img: RgbaImage,
  pixels: Uint32Array,
  opts: SamplerOptions = {},
): RegionSample {
  const trimLow = opts.lumTrimLow ?? LUMINANCE_TRIM_LOW;
  const trimHigh = opts.lumTrimHigh ?? LUMINANCE_TRIM_HIGH;
  const maxDeltaE = opts.outlierDeltaE ?? OUTLIER_DELTA_E;
  const minValid = opts.minValidPixels ?? MIN_VALID_PIXELS;

  const items = Array.from(pixels, (i) => ({ i, lab: pixelLab(img, i, opts.gains) }));
  // 1. Luminance trim (by L*), relative to this region.
  items.sort((p, q) => p.lab.L - q.lab.L);
  const lo = Math.floor(items.length * trimLow);
  const hi = items.length - Math.floor(items.length * trimHigh);
  const trimmed = items.slice(lo, Math.max(lo, hi));
  // 2. ΔE outlier removal around the trimmed median.
  const centre = trimmed.length > 0 ? medianLab(trimmed.map((t) => t.lab)) : null;
  const kept = centre ? trimmed.filter((t) => deltaE76(t.lab, centre) <= maxDeltaE) : [];
  kept.sort((p, q) => p.i - q.i);
  return {
    totalPixels: pixels.length,
    validPixels: kept.length,
    validIndices: Uint32Array.from(kept, (k) => k.i),
    median: kept.length > 0 ? medianLab(kept.map((k) => k.lab)) : null,
    // 3. Minimum count.
    enough: kept.length >= minValid,
  };
}

/** Sample all three skin regions of one face. Landmarks in pixel coordinates. */
export function sampleSkin(
  img: RgbaImage,
  landmarksPx: readonly Point[],
  opts: SamplerOptions = {},
): SkinSample {
  const geometry = buildSampledRegions(landmarksPx);
  const regions = {} as Record<RegionName, RegionSample>;
  for (const name of REGION_NAMES) {
    const pixels = rasterizePolygon(geometry.regions[name], img.width, img.height);
    regions[name] = sampleRegionPixels(img, pixels, opts);
  }
  const lowPixelRegions = REGION_NAMES.filter((n) => !regions[n].enough);
  const usable = REGION_NAMES.filter((n) => regions[n].enough);

  // Weighted median over pixels: each region contributes its weight, split over its pixels, so
  // a large forehead can't outvote the cheeks. Weights are renormalised over usable regions.
  let overall: Lab | null = null;
  if (usable.length > 0) {
    const L: number[] = [];
    const a: number[] = [];
    const b: number[] = [];
    const w: number[] = [];
    for (const name of usable) {
      const r = regions[name];
      const each = REGION_WEIGHTS[name] / r.validPixels;
      for (const i of r.validIndices) {
        const lab = pixelLab(img, i, opts.gains);
        L.push(lab.L);
        a.push(lab.a);
        b.push(lab.b);
        w.push(each);
      }
    }
    overall = { L: weightedMedian(L, w), a: weightedMedian(a, w), b: weightedMedian(b, w) };
  }

  const left = regions.leftCheek;
  const right = regions.rightCheek;
  const both = left.enough && right.enough && left.median && right.median;
  const cheekDeltaE = both ? deltaE76(left.median!, right.median!) : null;
  const cheekDifference = both
    ? {
        lightness: Math.abs(left.median!.L - right.median!.L),
        chromatic: Math.hypot(left.median!.a - right.median!.a, left.median!.b - right.median!.b),
      }
    : null;

  return {
    regions,
    geometry,
    overall,
    lowPixelRegions,
    cheekDeltaE,
    cheekDifference,
    unevenLighting: cheekDeltaE !== null && cheekDeltaE > CHEEK_DISAGREEMENT_DELTA_E,
    calibrated: opts.gains !== undefined,
  };
}
