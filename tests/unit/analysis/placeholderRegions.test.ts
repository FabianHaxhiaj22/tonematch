import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_GEOMETRY,
  buildPlaceholderRegions,
  indicesOf,
  type FeatureIndexSets,
  type Point,
} from "@/lib/analysis/placeholderRegions";

/**
 * Synthetic "face" in pixel coordinates (y grows downwards), built so every expected box is
 * easy to compute by hand:
 *   face oval top y = 0     (indices 0–3)
 *   subject-left eye  x 60–80,  y 40–50   (indices 4–5; appears on the image's right)
 *   subject-right eye x 20–40,  y 42–50   (indices 6–7)
 *   lips top y = 90                       (indices 8–9)
 */
const POINTS: Point[] = [
  { x: 50, y: 0 },
  { x: 0, y: 50 },
  { x: 100, y: 50 },
  { x: 50, y: 120 },
  { x: 60, y: 40 },
  { x: 80, y: 50 },
  { x: 20, y: 42 },
  { x: 40, y: 50 },
  { x: 35, y: 90 },
  { x: 65, y: 100 },
];

const SETS: FeatureIndexSets = {
  faceOval: [0, 1, 2, 3],
  leftEye: [4, 5],
  rightEye: [6, 7],
  lips: [8, 9],
};

const ys = (poly: Point[]) => [
  Math.min(...poly.map((p) => p.y)),
  Math.max(...poly.map((p) => p.y)),
];
const xs = (poly: Point[]) => [
  Math.min(...poly.map((p) => p.x)),
  Math.max(...poly.map((p) => p.x)),
];

describe("buildPlaceholderRegions", () => {
  const regions = buildPlaceholderRegions(POINTS, SETS);

  it("puts the forehead between the oval top and the eyes, spanning both eyes", () => {
    // eyesTop = 40; band = 0 + 40·0.25 … 0 + 40·0.6
    expect(ys(regions.forehead)).toEqual([10, 24]);
    expect(xs(regions.forehead)).toEqual([20, 80]);
  });

  it("puts each cheek under its own eye, between the eye and the lips", () => {
    // left eye bottom 50 → lips top 90: 50 + 40·0.25 … 50 + 40·0.75
    expect(ys(regions.leftCheek)).toEqual([60, 80]);
    expect(xs(regions.leftCheek)).toEqual([60, 80]);
    expect(ys(regions.rightCheek)).toEqual([60, 80]);
    expect(xs(regions.rightCheek)).toEqual([20, 40]);
  });

  it("returns closed 4-point boxes", () => {
    for (const poly of [regions.forehead, regions.leftCheek, regions.rightCheek]) {
      expect(poly).toHaveLength(4);
    }
  });

  it("accepts custom geometry", () => {
    const r = buildPlaceholderRegions(POINTS, SETS, {
      ...PLACEHOLDER_GEOMETRY,
      foreheadTop: 0,
      foreheadBottom: 1,
    });
    expect(ys(r.forehead)).toEqual([0, 40]);
  });

  it("throws when a landmark index is missing", () => {
    expect(() => buildPlaceholderRegions(POINTS, { ...SETS, lips: [8, 99] })).toThrow(RangeError);
  });

  it("throws on an empty index set", () => {
    expect(() => buildPlaceholderRegions(POINTS, { ...SETS, leftEye: [] })).toThrow(RangeError);
  });
});

describe("indicesOf", () => {
  it("returns the sorted unique indices of a connection list", () => {
    expect(
      indicesOf([
        { start: 10, end: 3 },
        { start: 3, end: 7 },
        { start: 7, end: 10 },
      ]),
    ).toEqual([3, 7, 10]);
  });

  it("returns an empty list for no connections", () => {
    expect(indicesOf([])).toEqual([]);
  });
});
