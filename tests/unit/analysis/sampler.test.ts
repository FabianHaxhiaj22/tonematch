import { describe, expect, it } from "vitest";
import { linearToSrgb, srgbToLab, srgbToLinear, type Rgb255 } from "@/lib/color";
import { CHEEK_MIN_PIXEL_RATIO, MIN_VALID_PIXELS, OUTLIER_DELTA_E } from "@/lib/analysis/config";
import { pixelLab, sampleRegionPixels, sampleSkin } from "@/lib/analysis/sampler";
import { REGION_NAMES } from "@/lib/analysis/regions";
import { deltaE76 } from "@/lib/analysis/stats";
import {
  getPixel,
  loadFixtureImage,
  loadFixtureLandmarks,
  noisy,
  prng,
  setPixel,
  solidImage,
  syntheticFace,
  syntheticPoseFace,
  toPixels,
} from "./helpers";

const SKIN: Rgb255 = { r: 176, g: 128, b: 102 };
const GREY: Rgb255 = { r: 128, g: 128, b: 128 };
// 800 × 1000 with the face at ~36% of the width: cheeks get well over MIN_VALID_PIXELS.
// (At 400 × 500 they don't: a ~140 px face is too small to sample.)
const W = 800;
const H = 1000;

describe("pixelLab", () => {
  it("matches srgbToLab without gains", () => {
    const img = solidImage(1, 1, SKIN);
    const lab = pixelLab(img, 0);
    const ref = srgbToLab(SKIN);
    expect(lab.L).toBeCloseTo(ref.L, 10);
    expect(lab.a).toBeCloseTo(ref.a, 10);
    expect(lab.b).toBeCloseTo(ref.b, 10);
  });
});

describe("sampleRegionPixels", () => {
  it("returns no median for no pixels", () => {
    const r = sampleRegionPixels(solidImage(2, 2, SKIN), new Uint32Array(0));
    expect(r).toMatchObject({ totalPixels: 0, validPixels: 0, median: null, enough: false });
  });
});

describe("sampleSkin on a uniform synthetic face", () => {
  const { img, landmarks } = syntheticFace(W, H, { background: GREY, skin: SKIN });
  const s = sampleSkin(img, landmarks);
  const ref = srgbToLab(SKIN);

  it("finds the skin colour in every region and overall", () => {
    for (const name of REGION_NAMES) {
      const r = s.regions[name];
      expect(r.enough).toBe(true);
      expect(r.validPixels).toBeGreaterThanOrEqual(MIN_VALID_PIXELS);
      expect(r.validIndices).toHaveLength(r.validPixels);
      expect(deltaE76(r.median!, ref)).toBeLessThan(1e-9);
    }
    expect(deltaE76(s.overall!, ref)).toBeLessThan(1e-9);
  });

  it("reports agreeing cheeks and no flags", () => {
    expect(s.cheekDeltaE).toBeCloseTo(0, 9);
    expect(s.cheekDifference).toEqual({ lightness: 0, chromatic: 0 });
    expect(s.unevenLighting).toBe(false);
    expect(s.lowPixelRegions).toEqual([]);
    expect(s.calibrated).toBe(false);
  });

  it("trims the luminance tails (10% + 10% by default)", () => {
    for (const name of REGION_NAMES) {
      const r = s.regions[name];
      const trimmed = r.totalPixels - 2 * Math.floor(r.totalPixels * 0.1);
      expect(r.validPixels).toBe(trimmed);
    }
  });
});

describe("filters", () => {
  it("ignores specular highlights, shadows and off-colour blemishes", () => {
    const face = syntheticFace(W, H, { background: GREY, skin: noisy(SKIN, 4) });
    const rnd = prng(7);
    // Blemish colour: about the same lightness as SKIN, very different hue (ΔE ≫ threshold).
    const blemish: Rgb255 = { r: 120, g: 140, b: 170 };
    expect(deltaE76(srgbToLab(blemish), srgbToLab(SKIN))).toBeGreaterThan(OUTLIER_DELTA_E);
    const planted = new Set<number>();
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = getPixel(face.img, x, y);
        if (c.r === GREY.r && c.g === GREY.g) continue; // background
        const u = rnd();
        const bad =
          u < 0.04
            ? { r: 255, g: 250, b: 245 }
            : u < 0.08
              ? { r: 20, g: 15, b: 12 }
              : u < 0.12
                ? blemish
                : null;
        if (bad) {
          setPixel(face.img, x, y, bad);
          planted.add(y * W + x);
        }
      }
    }
    const clean = sampleSkin(
      syntheticFace(W, H, { background: GREY, skin: noisy(SKIN, 4) }).img,
      face.landmarks,
    );
    const s = sampleSkin(face.img, face.landmarks);
    for (const name of REGION_NAMES) {
      const r = s.regions[name];
      expect(r.validIndices.some((i) => planted.has(i))).toBe(false);
      expect(deltaE76(r.median!, clean.regions[name].median!)).toBeLessThan(1.5);
    }
  });

  it("flags regions with too few valid pixels and leaves them out of the overall median", () => {
    const { img, landmarks } = syntheticFace(W, H, { background: GREY, skin: SKIN });
    const counts = sampleSkin(img, landmarks, { minValidPixels: 0 }).regions;
    // A minimum between the right cheek's count and the others' → only the right cheek fails.
    const min = counts.rightCheek.validPixels + 1;
    expect(counts.leftCheek.validPixels).toBeGreaterThan(min);
    expect(counts.forehead.validPixels).toBeGreaterThan(min);
    const s = sampleSkin(img, landmarks, { minValidPixels: min });
    expect(s.lowPixelRegions).toEqual(["rightCheek"]);
    expect(s.overall).not.toBeNull();
    expect(s.cheekDeltaE).toBeNull();
    expect(s.cheekDifference).toBeNull();
    expect(s.unevenLighting).toBe(false);
  });

  it("returns no overall colour when no region has enough pixels (tiny face)", () => {
    const { img, landmarks } = syntheticFace(160, 200, { background: GREY, skin: SKIN });
    const s = sampleSkin(img, landmarks);
    expect(s.lowPixelRegions).toEqual(REGION_NAMES);
    expect(s.overall).toBeNull();
  });

  it("accepts custom trim and ΔE settings", () => {
    const { img, landmarks } = syntheticFace(W, H, { background: GREY, skin: SKIN });
    const s = sampleSkin(img, landmarks, { lumTrimLow: 0, lumTrimHigh: 0, outlierDeltaE: 0 });
    for (const name of REGION_NAMES) {
      expect(s.regions[name].validPixels).toBe(s.regions[name].totalPixels);
    }
  });
});

describe("weighting and cheek disagreement", () => {
  it("weights cheeks 0.4 + 0.4 over the forehead's 0.2", () => {
    const fore: Rgb255 = { r: 200, g: 160, b: 140 };
    const { landmarks } = syntheticFace(W, H, { background: GREY, skin: SKIN });
    const eyeY = landmarks[159]!.y; // upper eyelid: forehead above, cheeks below
    const { img } = syntheticFace(W, H, {
      background: GREY,
      skin: (_x, y) => (y < eyeY ? fore : SKIN),
    });
    const s = sampleSkin(img, landmarks);
    expect(deltaE76(s.regions.forehead.median!, srgbToLab(fore))).toBeLessThan(1e-9);
    expect(deltaE76(s.overall!, srgbToLab(SKIN))).toBeLessThan(1e-9);
  });

  it("flags uneven lighting when one cheek is much darker, and splits the difference", () => {
    const lit: Rgb255 = SKIN;
    const shaded: Rgb255 = { r: 120, g: 84, b: 66 };
    const { landmarks } = syntheticFace(W, H, { background: GREY, skin: SKIN });
    const midX = landmarks[1]!.x; // nose tip
    const { img } = syntheticFace(W, H, {
      background: GREY,
      skin: (x) => (x < midX ? shaded : lit),
    });
    const s = sampleSkin(img, landmarks);
    const expected = deltaE76(srgbToLab(lit), srgbToLab(shaded));
    expect(s.cheekDeltaE).toBeCloseTo(expected, 9);
    expect(s.unevenLighting).toBe(true);
    const l = srgbToLab(lit);
    const d = srgbToLab(shaded);
    expect(s.cheekDifference!.lightness).toBeCloseTo(Math.abs(l.L - d.L), 9);
    expect(s.cheekDifference!.chromatic).toBeCloseTo(Math.hypot(l.a - d.a, l.b - d.b), 9);
  });
});

describe("cheek imbalance", () => {
  it("frontal face: no imbalance, all regions used", () => {
    const f = syntheticPoseFace(W, H, {}, { background: GREY, skin: SKIN });
    const s = sampleSkin(f.img, f.landmarks);
    expect(s.cheekImbalance).toBeNull();
    expect(s.usedRegions).toEqual(REGION_NAMES);
  });

  it("strong head turn: the far cheek is flagged and left out; the near cheek carries it", () => {
    const near: Rgb255 = SKIN;
    const far: Rgb255 = { r: 120, g: 84, b: 66 };
    const { landmarks } = syntheticPoseFace(W, H, { yaw: -28 }, { background: GREY, skin: SKIN });
    const midX = landmarks[1]!.x;
    const f = syntheticPoseFace(
      W,
      H,
      { yaw: -28 },
      { background: GREY, skin: (x) => (x < midX ? far : near) },
    );
    const s = sampleSkin(f.img, f.landmarks);
    const ratio = s.regions.rightCheek.validPixels / s.regions.leftCheek.validPixels;
    expect(ratio).toBeLessThan(CHEEK_MIN_PIXEL_RATIO);
    expect(s.cheekImbalance).toEqual({ ratio, smaller: "rightCheek" });
    expect(s.usedRegions).toEqual(["leftCheek", "forehead"]);
    expect(s.cheekDeltaE).toBeNull();
    expect(s.unevenLighting).toBe(false);
    // The far cheek's colour no longer pulls the overall median.
    expect(deltaE76(s.overall!, srgbToLab(near))).toBeLessThan(1e-9);
  });

  it("reports the clip per region, so a lost cheek can be traced", () => {
    const f = syntheticPoseFace(W, H, { yaw: -35 }, { background: GREY, skin: SKIN });
    const g = sampleSkin(f.img, f.landmarks).geometry;
    expect(g.keptAreaFraction.rightCheek).toBeLessThan(0.8);
    expect(g.keptAreaFraction.leftCheek).toBeCloseTo(1, 6);
  });
});

describe("white-balance gains", () => {
  it("undo a known colour cast on the skin (within 8-bit rounding)", () => {
    const cast = { r: 1.2, g: 1, b: 0.75 }; // warm cast, in linear RGB
    const castSkin = linearToSrgb(
      (({ r, g, b }) => ({ r: r * cast.r, g: g * cast.g, b: b * cast.b }))(srgbToLinear(SKIN)),
    );
    const { img, landmarks } = syntheticFace(W, H, { background: GREY, skin: castSkin });
    const gains = { r: 1 / cast.r, g: 1, b: 1 / cast.b };
    const before = sampleSkin(img, landmarks);
    const after = sampleSkin(img, landmarks, { gains });
    expect(after.calibrated).toBe(true);
    expect(deltaE76(before.overall!, srgbToLab(SKIN))).toBeGreaterThan(5);
    expect(deltaE76(after.overall!, srgbToLab(SKIN))).toBeLessThan(1);
  });
});

/** Structure only (tests/fixtures/SOURCES.md): no assertions on the person's colour values. */
describe("NASA fixture", () => {
  it("samples all three regions with enough valid pixels", () => {
    const img = loadFixtureImage();
    const face = loadFixtureLandmarks().faces[0]!;
    const s = sampleSkin(img, toPixels(face.landmarks, img.width, img.height));
    expect(s.lowPixelRegions).toEqual([]);
    for (const name of REGION_NAMES) {
      expect(s.regions[name].validPixels).toBeGreaterThanOrEqual(MIN_VALID_PIXELS);
      // Filters remove some pixels but not most of them.
      expect(s.regions[name].validPixels / s.regions[name].totalPixels).toBeGreaterThan(0.6);
    }
    expect(s.overall).not.toBeNull();
    expect(s.cheekDeltaE).not.toBeNull();
  });
});
