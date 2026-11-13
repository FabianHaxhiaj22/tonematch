import { describe, expect, it } from "vitest";
import { srgbChannelToLinear } from "@/lib/color";
import {
  SRGB_TO_LINEAR_LUT,
  lumaAt,
  maskFromIndices,
  rasterizePolygon,
} from "@/lib/analysis/image";
import { polygonArea, type Point } from "@/lib/analysis/geometry";
import { solidImage } from "./helpers";

const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 },
  { x: x1, y: y0 },
  { x: x1, y: y1 },
  { x: x0, y: y1 },
];

describe("rasterizePolygon", () => {
  it("covers exactly the pixels whose centres are inside an axis-aligned rectangle", () => {
    // Rectangle 1..4 × 2..5 → pixel centres x 1.5–3.5, y 2.5–4.5 → 3 × 3 pixels.
    const idx = rasterizePolygon(rect(1, 2, 4, 5), 10, 10);
    expect(Array.from(idx)).toEqual([21, 22, 23, 31, 32, 33, 41, 42, 43]);
  });

  it("approximates the area of a rotated polygon", () => {
    const diamond: Point[] = [
      { x: 50, y: 10 },
      { x: 90, y: 50 },
      { x: 50, y: 90 },
      { x: 10, y: 50 },
    ];
    const n = rasterizePolygon(diamond, 100, 100).length;
    expect(Math.abs(n - polygonArea(diamond)) / polygonArea(diamond)).toBeLessThan(0.03);
  });

  it("leaves out the notch of a concave polygon", () => {
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
    const idx = new Set(rasterizePolygon(c, 10, 10));
    expect(idx.has(5 * 10 + 7)).toBe(false); // (7, 5) in the notch
    expect(idx.has(5 * 10 + 2)).toBe(true);
    expect(idx.size).toBe(100 - 12);
  });

  it("clamps to the image and handles polygons partly or fully outside", () => {
    expect(rasterizePolygon(rect(-5, -5, 2, 2), 4, 4)).toHaveLength(4);
    expect(rasterizePolygon(rect(10, 10, 20, 20), 4, 4)).toHaveLength(0);
  });

  it("returns nothing for degenerate polygons", () => {
    expect(rasterizePolygon(rect(0, 0, 3, 3).slice(0, 2), 4, 4)).toHaveLength(0);
  });
});

describe("maskFromIndices", () => {
  it("sets 1 at the given indices only", () => {
    expect(Array.from(maskFromIndices(Uint32Array.from([0, 3]), 2, 2))).toEqual([1, 0, 0, 1]);
  });
});

describe("lumaAt and the linear LUT", () => {
  it("uses Rec. 709 weights", () => {
    expect(lumaAt(solidImage(1, 1, { r: 255, g: 255, b: 255 }), 0)).toBeCloseTo(255);
    expect(lumaAt(solidImage(1, 1, { r: 0, g: 255, b: 0 }), 0)).toBeCloseTo(0.7152 * 255);
  });

  it("matches srgbChannelToLinear for every value", () => {
    expect(SRGB_TO_LINEAR_LUT).toHaveLength(256);
    for (const v of [0, 1, 10, 128, 254, 255]) {
      expect(SRGB_TO_LINEAR_LUT[v]).toBe(srgbChannelToLinear(v));
    }
  });
});
