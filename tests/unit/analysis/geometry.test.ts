import { describe, expect, it } from "vitest";
import {
  boundingBox,
  clipToInsetConvex,
  convexHull,
  pointInPolygon,
  polygonArea,
  signedArea,
  type Point,
} from "@/lib/analysis/geometry";

const square = (s: number, x0 = 0, y0 = 0): Point[] => [
  { x: x0, y: y0 },
  { x: x0 + s, y: y0 },
  { x: x0 + s, y: y0 + s },
  { x: x0, y: y0 + s },
];

describe("areas and boxes", () => {
  it("signedArea flips sign with orientation; polygonArea doesn't", () => {
    const sq = square(10);
    expect(signedArea(sq)).toBe(100);
    expect(signedArea([...sq].reverse())).toBe(-100);
    expect(polygonArea([...sq].reverse())).toBe(100);
  });

  it("boundingBox covers all points and rejects empty input", () => {
    expect(
      boundingBox([
        { x: 3, y: -1 },
        { x: -2, y: 5 },
      ]),
    ).toEqual({
      minX: -2,
      minY: -1,
      maxX: 3,
      maxY: 5,
    });
    expect(() => boundingBox([])).toThrow(RangeError);
  });
});

describe("pointInPolygon", () => {
  it("handles convex and concave polygons", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square(10))).toBe(true);
    expect(pointInPolygon({ x: 15, y: 5 }, square(10))).toBe(false);
    // "C" shape: the notch (x 4–10, y 4–6) is outside.
    const c: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 6 },
      { x: 10, y: 6 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 7, y: 5 }, c)).toBe(false);
    expect(pointInPolygon({ x: 2, y: 5 }, c)).toBe(true);
  });
});

describe("convexHull", () => {
  it("drops interior and collinear points", () => {
    const pts = [...square(10), { x: 5, y: 5 }, { x: 5, y: 0 }, { x: 2, y: 7 }];
    const hull = convexHull(pts);
    expect(hull).toHaveLength(4);
    expect(polygonArea(hull)).toBe(100);
  });

  it("returns small inputs as they are", () => {
    expect(convexHull([{ x: 1, y: 1 }])).toEqual([{ x: 1, y: 1 }]);
  });
});

describe("clipToInsetConvex", () => {
  it("leaves a polygon well inside unchanged", () => {
    const inner = square(2, 4, 4);
    expect(polygonArea(clipToInsetConvex(inner, square(10), 1))).toBeCloseTo(4);
  });

  it("clips to the inset square, whatever the clip polygon's orientation", () => {
    const big = square(20, -5, -5); // covers the clip square completely
    for (const clip of [square(10), [...square(10)].reverse()]) {
      const out = clipToInsetConvex(big, clip, 2);
      // Inset square is 2..8 → 6 × 6.
      expect(polygonArea(out)).toBeCloseTo(36);
      for (const p of out) {
        expect(p.x).toBeGreaterThanOrEqual(2 - 1e-9);
        expect(p.x).toBeLessThanOrEqual(8 + 1e-9);
      }
    }
  });

  it("clips a partly-outside polygon (half of it remains)", () => {
    const half = clipToInsetConvex(square(10, 5, 0), square(10), 0);
    expect(polygonArea(half)).toBeCloseTo(50);
  });

  it("returns [] when nothing is left", () => {
    expect(clipToInsetConvex(square(2, 20, 20), square(10), 0)).toEqual([]);
    expect(clipToInsetConvex(square(10), square(10), 6)).toEqual([]);
  });

  it("ignores zero-length clip edges", () => {
    const clip = [...square(10), { x: 0, y: 10 }]; // last point repeated
    expect(polygonArea(clipToInsetConvex(square(20, -5, -5), clip, 0))).toBeCloseTo(100);
  });

  it("rejects a degenerate clip polygon or a negative inset", () => {
    expect(() => clipToInsetConvex(square(1), square(1).slice(0, 2), 0)).toThrow(RangeError);
    expect(() => clipToInsetConvex(square(1), square(10), -1)).toThrow(RangeError);
  });
});
