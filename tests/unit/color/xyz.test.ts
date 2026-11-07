import { describe, expect, it } from "vitest";
import { D65_WHITE, SRGB_TO_XYZ_D65, linearRgbToXyz } from "@/lib/color";

describe("linearRgbToXyz", () => {
  it("maps linear white to the D65 white point (matrix rows sum to D65)", () => {
    const xyz = linearRgbToXyz({ r: 1, g: 1, b: 1 });
    expect(xyz.x).toBeCloseTo(D65_WHITE.x, 12);
    expect(xyz.z).toBeCloseTo(D65_WHITE.z, 12);
    // The published Y row sums to 1.0000001 (7-decimal rounding); see constants.ts.
    expect(Math.abs(xyz.y - D65_WHITE.y)).toBeLessThanOrEqual(1.000001e-7);
  });

  it("maps black to zero", () => {
    expect(linearRgbToXyz({ r: 0, g: 0, b: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  // Each primary maps to its matrix column (published sRGB/D65 matrix, Lindbloom).
  it.each([
    { name: "red", rgb: { r: 1, g: 0, b: 0 }, xyz: [0.4124564, 0.2126729, 0.0193339] },
    { name: "green", rgb: { r: 0, g: 1, b: 0 }, xyz: [0.3575761, 0.7151522, 0.119192] },
    { name: "blue", rgb: { r: 0, g: 0, b: 1 }, xyz: [0.1804375, 0.072175, 0.9503041] },
  ])("maps the $name primary to its matrix column", ({ rgb, xyz }) => {
    const out = linearRgbToXyz(rgb);
    expect(out.x).toBeCloseTo(xyz[0]!, 7);
    expect(out.y).toBeCloseTo(xyz[1]!, 7);
    expect(out.z).toBeCloseTo(xyz[2]!, 7);
  });

  it("uses the luminance row for Y (Rec. 709 / sRGB luma weights)", () => {
    const [, rowY] = SRGB_TO_XYZ_D65;
    expect(linearRgbToXyz({ r: 0.5, g: 0.25, b: 0.125 }).y).toBeCloseTo(
      rowY[0] * 0.5 + rowY[1] * 0.25 + rowY[2] * 0.125,
      12,
    );
  });
});
