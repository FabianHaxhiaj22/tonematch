import { describe, expect, it } from "vitest";
import { linearToSrgb } from "@/lib/color";
import { WB_PATCH_RADIUS } from "@/lib/analysis/config";
import { applyGains, measureWhitePatch } from "@/lib/analysis/whiteBalance";
import { imageFrom, solidImage } from "./helpers";

const Y = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe("measureWhitePatch", () => {
  it("computes gains that make warm-lit paper neutral and keep its luminance", () => {
    const paper = linearToSrgb({ r: 0.8, g: 0.65, b: 0.45 });
    const res = measureWhitePatch(solidImage(50, 50, paper), 25, 25);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const corrected = applyGains(res.patchMean, res.gains);
    expect(corrected.r).toBeCloseTo(corrected.g, 9);
    expect(corrected.g).toBeCloseTo(corrected.b, 9);
    expect(Y(corrected)).toBeCloseTo(Y(res.patchMean), 9);
    expect(res.gains.b).toBeGreaterThan(1);
    expect(res.gains.r).toBeLessThan(1);
    const side = 2 * WB_PATCH_RADIUS + 1;
    expect(res.pixels).toBe(side * side);
  });

  it("averages only the patch, clipped at the image border", () => {
    const img = imageFrom(40, 40, (x) =>
      x < 20 ? { r: 200, g: 200, b: 200 } : { r: 0, g: 0, b: 0 },
    );
    const res = measureWhitePatch(img, 0, 0, 3);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.pixels).toBe(16);
  });

  it.each([
    ["OUTSIDE_IMAGE", solidImage(10, 10, { r: 220, g: 220, b: 220 }), -1, 5],
    ["OUTSIDE_IMAGE", solidImage(10, 10, { r: 220, g: 220, b: 220 }), 5, 10],
    ["TOO_DARK", solidImage(20, 20, { r: 60, g: 60, b: 60 }), 10, 10],
    ["CLIPPED", solidImage(20, 20, { r: 255, g: 255, b: 255 }), 10, 10],
    ["GAINS_OUT_OF_RANGE", solidImage(20, 20, { r: 240, g: 120, b: 110 }), 10, 10],
  ] as const)("rejects with %s", (reason, img, x, y) => {
    const res = measureWhitePatch(img, x, y);
    expect(res).toMatchObject({ ok: false, reason });
  });
});

describe("applyGains", () => {
  it("multiplies per channel and clamps to [0, 1]", () => {
    expect(applyGains({ r: 0.5, g: 0.5, b: 0.6 }, { r: 2, g: 1, b: 2 })).toEqual({
      r: 1,
      g: 0.5,
      b: 1,
    });
    expect(applyGains({ r: 0.2, g: 0.2, b: 0.2 }, { r: -1, g: 1, b: 1 }).r).toBe(0);
  });
});
