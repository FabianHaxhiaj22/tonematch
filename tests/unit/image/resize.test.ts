import { describe, expect, it } from "vitest";
import { ANALYSIS_MAX_LONG_SIDE_PX, fitLongSide } from "@/lib/image";

describe("fitLongSide (analysis downscale, D-035)", () => {
  it.each([
    // [width, height, expected width, expected height]
    [8000, 6000, 1600, 1200], // 48 MP landscape
    [6000, 8000, 1200, 1600], // 48 MP portrait
    [4032, 3024, 1600, 1200], // 12 MP phone photo
    [3000, 3000, 1600, 1600], // square
    [1601, 900, 1600, 899], // just over: rounds, keeps the ratio
  ])("%i × %i → %i × %i", (w, h, ew, eh) => {
    const r = fitLongSide(w, h, ANALYSIS_MAX_LONG_SIDE_PX);
    expect([r.width, r.height]).toEqual([ew, eh]);
    expect(Math.max(r.width, r.height)).toBe(ANALYSIS_MAX_LONG_SIDE_PX);
    expect(r.scale).toBeLessThan(1);
  });

  it("never enlarges a photo that already fits", () => {
    expect(fitLongSide(1280, 1600, 1600)).toEqual({ width: 1280, height: 1600, scale: 1 });
    expect(fitLongSide(640, 480, 1600)).toEqual({ width: 640, height: 480, scale: 1 });
  });

  it("keeps very thin images at least 1 px wide", () => {
    expect(fitLongSide(10_000, 2, 1600)).toEqual({ width: 1600, height: 1, scale: 0.16 });
  });

  it.each([
    [0, 100, 1600],
    [100, -1, 1600],
    [100, 100, 0],
    [Number.NaN, 100, 1600],
    [100, Number.POSITIVE_INFINITY, 1600],
  ])("rejects %s × %s (max %s)", (w, h, max) => {
    expect(() => fitLongSide(w, h, max)).toThrow(RangeError);
  });

  it("the analysis limit is 1600 px (SPEC §14, D-035)", () => {
    expect(ANALYSIS_MAX_LONG_SIDE_PX).toBe(1600);
  });
});
