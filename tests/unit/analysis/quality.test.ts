import { describe, expect, it } from "vitest";
import { linearToSrgb, srgbToLinear, type Rgb255 } from "@/lib/color";
import {
  BLUR_MIN_LAPLACIAN_VARIANCE,
  COLOR_CAST_MAX_CHROMA,
  IMAGE_MIN_P99_LUMA,
  MAX_PITCH_DEG,
  MAX_YAW_DEG,
} from "@/lib/analysis/config";
import type { RgbaImage } from "@/lib/analysis/image";
import {
  assessQuality,
  backgroundCast,
  laplacianVariance,
  type QualityCode,
  type QualityFace,
} from "@/lib/analysis/quality";
import {
  loadFixtureImage,
  loadFixtureLandmarks,
  noisy,
  rotationMatrix,
  syntheticFace,
  syntheticPoseFace,
  toPixels,
  type SyntheticFace,
} from "./helpers";

const W = 400;
const H = 500;
const GREY: Rgb255 = { r: 120, g: 120, b: 120 };
const WHITE_CARD: Rgb255 = { r: 235, g: 235, b: 235 };

/** Neutral grey background with a white card in the top-left corner (bright neutral area). */
const studio = (x: number, y: number): Rgb255 => (x < 90 && y < 90 ? WHITE_CARD : GREY);

const codes = (img: RgbaImage, faces: QualityFace[]) =>
  assessQuality(img, faces).issues.map((i) => i.code);

const asFace = (f: SyntheticFace, matrix = f.matrix): QualityFace => ({
  landmarksPx: f.landmarks,
  matrix,
});

/**
 * Apply a per-channel linear-light multiplier to every pixel (exposure or colour cast).
 * Uses a 256-entry table per channel (inputs are 8-bit), so a 2 MP image stays fast.
 */
function transform(img: RgbaImage, k: { r: number; g: number; b: number }): RgbaImage {
  const table = (gain: number) =>
    Uint8ClampedArray.from({ length: 256 }, (_, v) => {
      const lin = Math.min(1, srgbToLinear({ r: v, g: 0, b: 0 }).r * gain);
      return linearToSrgb({ r: lin, g: 0, b: 0 }).r;
    });
  const [tr, tg, tb] = [table(k.r), table(k.g), table(k.b)];
  const data = new Uint8ClampedArray(img.data.length);
  for (let o = 0; o < data.length; o += 4) {
    data[o] = tr[img.data[o]!]!;
    data[o + 1] = tg[img.data[o + 1]!]!;
    data[o + 2] = tb[img.data[o + 2]!]!;
    data[o + 3] = 255;
  }
  return { width: img.width, height: img.height, data };
}

const SKIN_TONES: Record<string, Rgb255> = {
  light: { r: 236, g: 200, b: 180 },
  medium: { r: 190, g: 140, b: 110 },
  deep: { r: 92, g: 60, b: 45 },
  veryDeep: { r: 60, g: 40, b: 32 },
};

describe("face count", () => {
  const img = syntheticFace(W, H, { background: studio, skin: GREY }).img;

  it("NO_FACE is blocking", () => {
    expect(assessQuality(img, [])).toEqual({
      ok: false,
      issues: [{ code: "NO_FACE", severity: "blocking" }],
      metrics: null,
    });
  });

  it("MULTIPLE_FACES is blocking", () => {
    const f = syntheticFace(W, H, { background: studio, skin: GREY });
    const r = assessQuality(img, [asFace(f), asFace(f)]);
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual([
      { code: "MULTIPLE_FACES", severity: "blocking", value: 2, limit: 1 },
    ]);
  });
});

describe("a good synthetic photo passes, for every skin depth", () => {
  it.each(Object.entries(SKIN_TONES))("%s skin in good light: no issues", (_name, skin) => {
    const f = syntheticFace(W, H, { background: studio, skin: noisy(skin, 10) });
    const r = assessQuality(f.img, [asFace(f, rotationMatrix(0, 0, 0))]);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("exposure is judged on clipping and the histogram, not on skin lightness", () => {
  it("deep skin in good light is NOT too dark", () => {
    const f = syntheticFace(W, H, { background: studio, skin: noisy(SKIN_TONES.veryDeep!, 10) });
    expect(codes(f.img, [asFace(f)])).not.toContain("TOO_DARK");
  });

  it("an underexposed photo is TOO_DARK via the histogram", () => {
    const f = syntheticFace(W, H, { background: studio, skin: noisy(SKIN_TONES.medium!, 10) });
    const dark = transform(f.img, { r: 0.08, g: 0.08, b: 0.08 });
    const r = assessQuality(dark, [asFace(f)]);
    const issue = r.issues.find((i) => i.code === "TOO_DARK");
    expect(issue).toMatchObject({ severity: "warning", limit: IMAGE_MIN_P99_LUMA });
    expect(r.metrics!.imageP99Luma).toBeLessThan(IMAGE_MIN_P99_LUMA);
  });

  it("crushed shadows on the face are TOO_DARK via face clipping", () => {
    let n = 0;
    const f = syntheticFace(W, H, {
      background: studio,
      skin: () => (n++ % 5 === 0 ? { r: 3, g: 2, b: 2 } : SKIN_TONES.medium!),
    });
    const r = assessQuality(f.img, [asFace(f)]);
    expect(r.metrics!.faceDarkClippedFraction).toBeGreaterThan(0.15);
    expect(r.issues.map((i) => i.code)).toContain("TOO_DARK");
  });

  it("blown highlights on the face are TOO_BRIGHT via face clipping", () => {
    let n = 0;
    const f = syntheticFace(W, H, {
      background: studio,
      skin: () => (n++ % 5 === 0 ? { r: 255, g: 255, b: 255 } : SKIN_TONES.light!),
    });
    expect(codes(f.img, [asFace(f)])).toContain("TOO_BRIGHT");
  });

  it("a washed-out photo is TOO_BRIGHT via the histogram", () => {
    const f = syntheticFace(W, H, {
      background: { r: 230, g: 230, b: 230 },
      skin: noisy({ r: 235, g: 215, b: 205 }, 4),
    });
    const r = assessQuality(f.img, [asFace(f)]);
    expect(r.metrics!.imageP1Luma).toBeGreaterThan(150);
    expect(r.issues.map((i) => i.code)).toContain("TOO_BRIGHT");
  });
});

describe("colour cast", () => {
  const skin = noisy(SKIN_TONES.medium!, 10);

  it("a warm cast on a neutral scene is flagged", () => {
    const f = syntheticFace(W, H, { background: studio, skin });
    const warm = transform(f.img, { r: 1.25, g: 1, b: 0.7 });
    const r = assessQuality(warm, [asFace(f)]);
    expect(r.metrics!.backgroundCastChroma).toBeGreaterThan(COLOR_CAST_MAX_CHROMA);
    expect(r.issues.map((i) => i.code)).toContain("COLOR_CAST");
  });

  it.each([
    ["cool", { r: 0.75, g: 1, b: 1.4 }],
    ["strong tungsten", { r: 1.5, g: 1, b: 0.5 }],
  ])("a %s cast on a neutral scene is flagged", (_name, k) => {
    const f = syntheticFace(W, H, { background: studio, skin });
    expect(codes(transform(f.img, k), [asFace(f)])).toContain("COLOR_CAST");
  });

  it("a coloured wall with something white in view is NOT a cast", () => {
    const blueWall = (x: number, y: number): Rgb255 =>
      x < 90 && y < 90 ? WHITE_CARD : { r: 60, g: 110, b: 190 };
    const f = syntheticFace(W, H, { background: blueWall, skin });
    expect(codes(f.img, [asFace(f)])).not.toContain("COLOR_CAST");
  });

  /** Saturated red folds: bright and dark stripes, as a curtain under neutral light. */
  const redCurtain = (x: number): Rgb255 => {
    const shade = 0.55 + 0.45 * Math.sin(x / 9);
    return { r: Math.round(200 * shade), g: Math.round(22 * shade), b: Math.round(28 * shade) };
  };

  it("a saturated red curtain in neutral light is NOT a cast (check skipped)", () => {
    const f = syntheticFace(W, H, { background: redCurtain, skin });
    const r = assessQuality(f.img, [asFace(f)]);
    expect(r.metrics!.backgroundCastChroma).toBeNull();
    expect(r.issues.map((i) => i.code)).not.toContain("COLOR_CAST");
  });

  it("a red curtain next to a grey wall in neutral light is NOT a cast", () => {
    const bg = (x: number): Rgb255 => (x < W / 2 ? redCurtain(x) : GREY);
    const f = syntheticFace(W, H, { background: bg, skin });
    const r = assessQuality(f.img, [asFace(f)]);
    expect(r.metrics!.backgroundCastChroma).toBeLessThan(COLOR_CAST_MAX_CHROMA);
    expect(r.issues.map((i) => i.code)).not.toContain("COLOR_CAST");
  });

  it("the real-photo case: red curtain, head turned (yaw -19, roll -16.5)", () => {
    const f = syntheticPoseFace(W, H, { yaw: -19, roll: -16.5 }, { background: redCurtain, skin });
    const found = codes(f.img, [asFace(f)]);
    expect(found).not.toContain("COLOR_CAST");
    expect(found).toContain("HEAD_TILTED"); // yaw 19 > 15
  });

  it("skips the check when there are too few neutral background pixels", () => {
    const img = syntheticFace(20, 20, { background: GREY, skin: GREY }).img;
    expect(backgroundCast(img, new Uint8Array(400))).toEqual({
      backgroundCastChroma: null,
      backgroundNeutralPixels: 100, // 20 x 20 sampled every 2 px
    });
  });

  it("skips the check when the neutral pixels don't form one cluster", () => {
    // Half warm-grey, half cool-grey: both within the candidate chroma, more than the radius apart.
    const img = syntheticFace(80, 80, {
      background: (x) => (x < 40 ? { r: 150, g: 120, b: 95 } : { r: 95, g: 120, b: 150 }),
      skin: GREY,
    }).img;
    expect(backgroundCast(img, new Uint8Array(80 * 80)).backgroundCastChroma).toBeNull();
  });
});

describe("blur", () => {
  it("a flat, textureless face is BLURRY; a textured one isn't", () => {
    const flat = syntheticFace(W, H, { background: studio, skin: SKIN_TONES.medium! });
    const r = assessQuality(flat.img, [asFace(flat)]);
    expect(r.issues.find((i) => i.code === "BLURRY")).toMatchObject({
      limit: BLUR_MIN_LAPLACIAN_VARIANCE,
    });
    const sharp = syntheticFace(W, H, { background: studio, skin: noisy(SKIN_TONES.medium!, 10) });
    expect(codes(sharp.img, [asFace(sharp)])).not.toContain("BLURRY");
  });

  it("returns 0 for a box too small to measure", () => {
    const img = syntheticFace(10, 10, { background: GREY, skin: GREY }).img;
    expect(laplacianVariance(img, { minX: 0, minY: 0, maxX: 2, maxY: 2 })).toBe(0);
  });
});

describe("head angle", () => {
  const f = syntheticFace(W, H, { background: studio, skin: noisy(SKIN_TONES.medium!, 10) });
  const tilt = (yaw: number, pitch: number, roll: number) =>
    assessQuality(f.img, [asFace(f, rotationMatrix(yaw, pitch, roll))]).issues.find(
      (i) => i.code === "HEAD_TILTED",
    );

  it.each([
    [16, 0, 0, 16, MAX_YAW_DEG],
    [-19, 0, -16.5, 19, MAX_YAW_DEG],
    [-30, 0, 0, 30, MAX_YAW_DEG],
    [0, 22, 0, 22, MAX_PITCH_DEG],
    [0, -28, 0, 28, MAX_PITCH_DEG],
    [16, 30, 0, 30, MAX_PITCH_DEG], // pitch is further past its limit (1.5x) than yaw
  ])("yaw %d / pitch %d / roll %d → HEAD_TILTED (%d° vs %d°)", (yaw, pitch, roll, v, limit) => {
    const issue = tilt(yaw, pitch, roll)!;
    expect(issue.value).toBeCloseTo(v, 6);
    expect(issue.limit).toBe(limit);
  });

  it("angles within the limits and pure roll are fine", () => {
    expect(tilt(14, -18, 0)).toBeUndefined();
    expect(tilt(-15, 20, 0)).toBeUndefined();
    expect(tilt(0, 0, 45)).toBeUndefined();
  });

  it("without a matrix the angle check is skipped", () => {
    const r = assessQuality(f.img, [asFace(f, null)]);
    expect(r.metrics!.angles).toBeNull();
    expect(r.issues.map((i) => i.code)).not.toContain("HEAD_TILTED");
  });
});

describe("face size", () => {
  it("a small face in the frame is FACE_TOO_SMALL", () => {
    const f = syntheticFace(W, H, {
      background: studio,
      skin: noisy(SKIN_TONES.medium!, 10),
      zoom: 0.8,
    });
    expect(codes(f.img, [asFace(f)])).toContain("FACE_TOO_SMALL");
  });
});

/**
 * Real-face fixture: structure and exposure only (tests/fixtures/SOURCES.md). It is a waist-up
 * studio portrait, so the face is under 25% of the width; nothing else should be flagged.
 */
describe("NASA fixture", () => {
  const img = loadFixtureImage();
  const face = loadFixtureLandmarks().faces[0]!;
  const q: QualityFace = {
    landmarksPx: toPixels(face.landmarks, img.width, img.height),
    matrix: face.matrix,
  };

  it("only flags the waist-up framing", () => {
    const expected: QualityCode[] = ["FACE_TOO_SMALL"];
    expect(codes(img, [q])).toEqual(expected);
  });

  it("an artificial warm cast is detected", () => {
    expect(codes(transform(img, { r: 1.3, g: 1, b: 0.7 }), [q])).toContain("COLOR_CAST");
  });
});
