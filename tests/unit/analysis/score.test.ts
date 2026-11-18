import { describe, expect, it } from "vitest";
import { hueAngle, linearToSrgb, srgbToLab, type Lab, type Rgb255 } from "@/lib/color";
import { FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL } from "@/lib/analysis/config";
import { assessQuality, type QualityResult } from "@/lib/analysis/quality";
import { sampleSkin } from "@/lib/analysis/sampler";
import { scoreAnalysis } from "@/lib/analysis/score";
import { photoUndertoneScore } from "@/lib/analysis/undertone";
import { deltaE76 } from "@/lib/analysis/stats";
import { noisy, poseLandmarks, syntheticPoseFace } from "./helpers";

const W = 800;
const H = 1000;
const GREY: Rgb255 = { r: 120, g: 120, b: 120 };
const studio = (x: number, y: number): Rgb255 =>
  x < 120 && y < 120 ? { r: 235, g: 235, b: 235 } : GREY;

/** sRGB colour for a target L*, chroma and hue (bisection on lightness; in-gamut skin colours). */
function skinRgb(L: number, C: number, hDeg: number): Rgb255 {
  const a = C * Math.cos((hDeg * Math.PI) / 180);
  const b = C * Math.sin((hDeg * Math.PI) / 180);
  // Lab → XYZ → linear sRGB → sRGB (inverse of the colour engine), D65.
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const X = 0.95047 * inv(fx);
  const Y = inv(fy);
  const Z = 1.08883 * inv(fz);
  const lin = {
    r: 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z,
    g: -0.969266 * X + 1.8760108 * Y + 0.041556 * Z,
    b: 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z,
  };
  const c = (v: number) => Math.min(1, Math.max(0, v));
  const s = linearToSrgb({ r: c(lin.r), g: c(lin.g), b: c(lin.b) });
  // Round like the 8-bit image will, so tests can compare against the colour really painted.
  return { r: Math.round(s.r), g: Math.round(s.g), b: Math.round(s.b) };
}

const EYE_Y = poseLandmarks({}, W, H).landmarks[159]!.y; // forehead above, cheeks below
const NO_ISSUES: QualityResult = { ok: true, issues: [], metrics: null };

/**
 * A synthetic face; forehead and cheeks can differ (e.g. blush). The quality gate only runs
 * when asked (it's the slow part and most tests don't need it).
 */
function face(skin: Rgb255, cheeks: Rgb255 = skin, withQuality = false) {
  const top = noisy(skin, 3, 1);
  const bottom = noisy(cheeks, 3, 2);
  const f = syntheticPoseFace(
    W,
    H,
    {},
    {
      background: studio,
      skin: (x, y) => (y > EYE_Y ? bottom(x, y) : top(x, y)),
    },
  );
  const quality = withQuality
    ? assessQuality(f.img, [{ landmarksPx: f.landmarks, matrix: f.matrix }])
    : NO_ISSUES;
  return { f, sample: sampleSkin(f.img, f.landmarks), quality };
}

describe("scoreAnalysis", () => {
  it("returns null when there is no usable skin colour", () => {
    const { f } = face(skinRgb(60, 20, 55));
    const tiny = sampleSkin(f.img, f.landmarks, { minValidPixels: 1e9 });
    expect(scoreAnalysis(tiny, { ok: true, issues: [], metrics: null }, {})).toBeNull();
  });

  it("produces depth, undertone and both confidences (with the real quality gate)", () => {
    // A smooth synthetic face (±3 noise) is correctly flagged BLURRY by the quality gate; as an
    // overridden warning it must lower photo confidence.
    const { sample, quality } = face(skinRgb(60, 20, 60), undefined, true);
    expect(quality.issues.map((i) => i.code)).toEqual(["BLURRY"]);
    const r = scoreAnalysis(sample, quality, {
      veins: "warm",
      daylight: "warm",
      metal: "neutral",
      white: "unsure",
    })!;
    expect(r.depth.mstApprox).toBeGreaterThanOrEqual(1);
    expect(r.depth.mstApprox).toBeLessThanOrEqual(10);
    expect(r.undertone.answeredCount).toBe(3);
    expect(r.undertone.photoScore).toBeGreaterThan(0); // hue 60° > neutral centre 55°
    expect(r.photoConfidence.value).toBeGreaterThan(0);
    expect(r.photoConfidence.factors.map((f) => f.reason)).toContain("BLURRY");
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it("photo/quiz disagreement is noted and lowers confidence", () => {
    const { sample, quality } = face(skinRgb(60, 20, 66)); // clearly warm hue
    const warm = scoreAnalysis(sample, quality, {
      veins: "warm",
      daylight: "warm",
      metal: "warm",
      white: "warm",
    })!;
    const cool = scoreAnalysis(sample, quality, {
      veins: "cool",
      daylight: "cool",
      metal: "cool",
      white: "cool",
    })!;
    expect(cool.notes).toContain("photoQuizDisagree");
    expect(cool.confidence).toBeLessThan(warm.confidence);
    expect(cool.photoConfidence).toEqual(warm.photoConfidence); // and the quiz can't change it
  });
});

describe("forehead weighting when cheeks look redder (blush, bronzer or flushing)", () => {
  it("shifts weight to the forehead and lowers photo confidence, without saying 'makeup'", () => {
    const skin = skinRgb(60, 20, 58);
    const blush = skinRgb(58, 28, 42);
    const plain = face(skin);
    const flushed = face(skin, blush);
    expect(flushed.sample.weightReasons).toContain("cheekRedness");
    expect(flushed.sample.weights.forehead).toBe(FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL);
    const scored = scoreAnalysis(flushed.sample, flushed.quality, {})!;
    const plainScored = scoreAnalysis(plain.sample, plain.quality, {})!;
    expect(scored.photoConfidence.value).toBeLessThan(plainScored.photoConfidence.value);
    expect(JSON.stringify(scored)).not.toMatch(/makeup|blush/i);
  });
});

describe("deep skin is not biased towards any undertone", { timeout: 30_000 }, () => {
  const HUES = [48, 55, 62]; // cool-ish, neutral, warm-ish
  const DEPTHS: [string, number, number][] = [
    ["very light", 78, 16],
    ["medium", 60, 20],
    ["deep", 40, 20],
    ["very deep", 26, 14],
  ];

  it.each(HUES)("hue %d°: the pipeline adds no depth-dependent shift", (h) => {
    for (const [, L, C] of DEPTHS) {
      const rgb = skinRgb(L, C, h);
      const painted = srgbToLab(rgb); // the colour really in the image (8-bit)
      expect(Math.abs(hueAngle(painted) - h)).toBeLessThan(1.5); // rounding only
      const { sample, quality } = face(rgb);
      const u = scoreAnalysis(sample, quality, {})!.undertone;
      // Measured photo score = the painted colour's score, at every depth (no bias added).
      expect(u.photoScore).toBeCloseTo(photoUndertoneScore(painted, { calibrated: false }), 1);
    }
  });

  // Well inside the cool and warm buckets even uncalibrated (the neutral bucket is a few degrees
  // of hue, close to 8-bit rounding, so it's covered by the exact painted-colour test above).
  it.each([38, 72])("hue %d°: same undertone label at every depth", (h) => {
    const labels = DEPTHS.map(([, L, C]) => {
      const { sample, quality } = face(skinRgb(L, C, h));
      return scoreAnalysis(sample, quality, {})!.undertone.label;
    });
    expect(new Set(labels).size).toBe(1);
  });

  it.each(DEPTHS)("%s skin without makeup: cheeks not flagged as redder", (_n, L, C) => {
    const { sample } = face(skinRgb(L, C, 55));
    expect(sample.weightReasons).toEqual([]);
  });

  it("the quiz scores the same answers the same way whatever the depth", () => {
    const answers = { veins: "cool", daylight: "neutral", metal: "cool", white: "unsure" } as const;
    const qs = DEPTHS.map(([, L, C]) => {
      const { sample, quality } = face(skinRgb(L, C, 55));
      return scoreAnalysis(sample, quality, answers)!.undertone.quizScore;
    });
    expect(new Set(qs).size).toBe(1);
  });

  it("the skin colours used here really span very light to very deep (sanity check)", () => {
    const depths = DEPTHS.map(([, L, C]) => {
      const { sample, quality } = face(skinRgb(L, C, 55));
      return scoreAnalysis(sample, quality, {})!.depth.label;
    });
    expect(depths[0]).toBe("very-light");
    expect(depths[3]).toBe("very-deep");
    const lab: Lab = srgbToLab(skinRgb(26, 14, 55));
    expect(
      deltaE76(lab, {
        L: 26,
        a: 14 * Math.cos((55 * Math.PI) / 180),
        b: 14 * Math.sin((55 * Math.PI) / 180),
      }),
    ).toBeLessThan(1);
  });
});
