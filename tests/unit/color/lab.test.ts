import { describe, expect, it } from "vitest";
import { CIE_KAPPA, D65_WHITE, srgbToLab, xyzToLab } from "@/lib/color";

/**
 * Widely published sRGB → CIELAB (D65, 2° observer) reference values, as given by Bruce
 * Lindbloom's CIE colour calculator and EasyRGB for the same matrix and white point.
 */
const REFERENCES = [
  { name: "white", rgb: { r: 255, g: 255, b: 255 }, lab: { L: 100, a: 0, b: 0 } },
  { name: "black", rgb: { r: 0, g: 0, b: 0 }, lab: { L: 0, a: 0, b: 0 } },
  { name: "mid grey 128", rgb: { r: 128, g: 128, b: 128 }, lab: { L: 53.585, a: 0, b: 0 } },
  { name: "red", rgb: { r: 255, g: 0, b: 0 }, lab: { L: 53.2408, a: 80.0925, b: 67.2032 } },
  { name: "green", rgb: { r: 0, g: 255, b: 0 }, lab: { L: 87.7347, a: -86.1827, b: 83.1793 } },
  { name: "blue", rgb: { r: 0, g: 0, b: 255 }, lab: { L: 32.297, a: 79.1875, b: -107.8602 } },
] as const;

describe("srgbToLab: published reference values", () => {
  it.each(REFERENCES)("$name", ({ rgb, lab }) => {
    const out = srgbToLab(rgb);
    // Published values have 3–4 decimals; 0.01 is well inside rounding of the source tables.
    expect(Math.abs(out.L - lab.L)).toBeLessThan(0.01);
    expect(Math.abs(out.a - lab.a)).toBeLessThan(0.01);
    expect(Math.abs(out.b - lab.b)).toBeLessThan(0.01);
  });

  it("gives neutral a* ≈ b* ≈ 0 for every grey", () => {
    // Not exactly 0: the published Y row sums to 1.0000001 (see constants.ts). The worst case is
    // at white: |a*| ≤ 500·(∛1.0000001 − 1) ≈ 1.67e-5 and |b*| ≤ 200·(…) ≈ 6.7e-6. Negligible.
    const maxA = 500 * (Math.cbrt(1.0000001) - 1) + 1e-12;
    const maxB = 200 * (Math.cbrt(1.0000001) - 1) + 1e-12;
    for (let v = 0; v <= 255; v++) {
      const { a, b } = srgbToLab({ r: v, g: v, b: v });
      expect(Math.abs(a)).toBeLessThanOrEqual(maxA);
      expect(Math.abs(b)).toBeLessThanOrEqual(maxB);
    }
  });
});

describe("xyzToLab", () => {
  it("maps the reference white to L* = 100, a* = b* = 0", () => {
    const out = xyzToLab(D65_WHITE);
    expect(out.L).toBeCloseTo(100, 10);
    expect(out.a).toBeCloseTo(0, 10);
    expect(out.b).toBeCloseTo(0, 10);
  });

  it("uses the linear segment below ε (very dark colours): L* = κ·Y", () => {
    const y = 0.001; // < ε = 216/24389 ≈ 0.008856
    const out = xyzToLab({ x: D65_WHITE.x * y, y, z: D65_WHITE.z * y });
    expect(out.L).toBeCloseTo(CIE_KAPPA * y, 9); // 0.903296…
    expect(out.a).toBeCloseTo(0, 9);
    expect(out.b).toBeCloseTo(0, 9);
  });

  it("uses the cube-root segment above ε: L* = 116·∛Y − 16", () => {
    const y = 0.18; // 18% grey card
    const out = xyzToLab({ x: D65_WHITE.x * y, y, z: D65_WHITE.z * y });
    expect(out.L).toBeCloseTo(116 * Math.cbrt(y) - 16, 9); // ≈ 49.496
  });

  it("accepts a custom reference white", () => {
    const d50 = { x: 0.96422, y: 1, z: 0.82521 };
    const out = xyzToLab(d50, d50);
    expect(out.L).toBeCloseTo(100, 10);
    expect(out.a).toBeCloseTo(0, 10);
    expect(out.b).toBeCloseTo(0, 10);
  });
});
