import { converter } from "culori";
import { describe, expect, it } from "vitest";
import {
  CIE_EPSILON,
  CIE_KAPPA,
  D65_WHITE,
  SRGB_TO_XYZ_D65,
  XYZ_D65_TO_SRGB,
  hexToRgb,
  inSrgbGamut,
  invert3,
  labToSrgb,
  labToXyz,
  linearRgbToXyz,
  rgbToHex,
  srgbToLab,
  xyzToLab,
  xyzToLinearRgb,
  type Rgb255,
} from "@/lib/color";
import { mulberry32, randInt } from "./prng";

/** Seeded colours over the whole sRGB cube plus a block in the skin range (as the culori test). */
function samples(): Rgb255[] {
  const rand = mulberry32(0x1ab2c3d4);
  const out: Rgb255[] = [];
  for (let i = 0; i < 8000; i++) {
    out.push({ r: randInt(rand, 0, 255), g: randInt(rand, 0, 255), b: randInt(rand, 0, 255) });
  }
  for (let i = 0; i < 2000; i++) {
    const r = randInt(rand, 45, 255);
    const g = randInt(rand, Math.round(r * 0.55), Math.round(r * 0.92));
    out.push({ r, g, b: randInt(rand, Math.round(g * 0.6), g) });
  }
  return out;
}
const SAMPLES = samples();

/** Round-trip error is floating-point noise only (measured ≤ 3e-12); 1e-9 leaves lots of room. */
const TOL_ROUND_TRIP = 1e-9;

describe("XYZ ↔ linear RGB matrices", () => {
  it("XYZ_D65_TO_SRGB is the inverse of SRGB_TO_XYZ_D65 (product = identity)", () => {
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let k = 0; k < 3; k++) sum += SRGB_TO_XYZ_D65[r]![k]! * XYZ_D65_TO_SRGB[k]![c]!;
        expect(sum).toBeCloseTo(r === c ? 1 : 0, 12);
      }
    }
  });

  it("matches Lindbloom's published inverse to its 7 decimals", () => {
    const published = [
      [3.2404542, -1.5371385, -0.4985314],
      [-0.969266, 1.8760108, 0.041556],
      [0.0556434, -0.2040259, 1.0572252],
    ];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        expect(Math.abs(XYZ_D65_TO_SRGB[r]![c]! - published[r]![c]!)).toBeLessThan(1e-6);
      }
    }
  });

  it("invert3 rejects a singular matrix", () => {
    expect(() =>
      invert3([
        [1, 2, 3],
        [2, 4, 6],
        [0, 1, 1],
      ]),
    ).toThrow(/not invertible/);
  });

  it("xyzToLinearRgb undoes linearRgbToXyz", () => {
    const lin = { r: 0.2, g: 0.55, b: 0.9 };
    const back = xyzToLinearRgb(linearRgbToXyz(lin));
    expect(back.r).toBeCloseTo(lin.r, 12);
    expect(back.g).toBeCloseTo(lin.g, 12);
    expect(back.b).toBeCloseTo(lin.b, 12);
  });
});

describe("labToXyz", () => {
  it("maps L* = 100, a* = b* = 0 to the reference white, and L* = 0 to black", () => {
    const w = labToXyz({ L: 100, a: 0, b: 0 });
    expect(w.x).toBeCloseTo(D65_WHITE.x, 12);
    expect(w.y).toBeCloseTo(1, 12);
    expect(w.z).toBeCloseTo(D65_WHITE.z, 12);
    expect(labToXyz({ L: 0, a: 0, b: 0 })).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("uses the linear segment for very dark colours (L* ≤ κ·ε ≈ 8)", () => {
    const L = 5;
    expect(L).toBeLessThan(CIE_KAPPA * CIE_EPSILON);
    const xyz = labToXyz({ L, a: 0, b: 0 });
    expect(xyz.y).toBeCloseTo(L / CIE_KAPPA, 12);
    const back = xyzToLab(xyz);
    expect(back.L).toBeCloseTo(L, 10);
    expect(back.a).toBeCloseTo(0, 10);
    expect(back.b).toBeCloseTo(0, 10);
  });

  it("undoes xyzToLab, including against a custom white", () => {
    const d50 = { x: 0.96422, y: 1, z: 0.82521 };
    for (const lab of [
      { L: 62, a: 13, b: 19 },
      { L: 3, a: 1, b: -2 },
      { L: 90, a: -20, b: 40 },
    ]) {
      for (const white of [D65_WHITE, d50]) {
        const back = xyzToLab(labToXyz(lab, white), white);
        expect(back.L).toBeCloseTo(lab.L, 10);
        expect(back.a).toBeCloseTo(lab.a, 10);
        expect(back.b).toBeCloseTo(lab.b, 10);
      }
    }
  });
});

describe(`labToSrgb: round trip over ${SAMPLES.length} seeded colours`, () => {
  it("sRGB → Lab → sRGB gives the colour back (|error| < 1e-9 per channel)", () => {
    let worst = 0;
    for (const c of SAMPLES) {
      const back = labToSrgb(srgbToLab(c));
      worst = Math.max(
        worst,
        Math.abs(back.r - c.r),
        Math.abs(back.g - c.g),
        Math.abs(back.b - c.b),
      );
    }
    expect(worst).toBeLessThan(TOL_ROUND_TRIP);
  });

  it("every round-tripped colour is in gamut and formats to the same hex", () => {
    for (const c of SAMPLES) {
      const back = labToSrgb(srgbToLab(c));
      expect(inSrgbGamut(back)).toBe(true);
      expect(rgbToHex(back)).toBe(rgbToHex(c));
    }
  });

  it("Lab → sRGB → Lab gives the Lab value back for in-gamut skin colours", () => {
    for (const lab of [
      { L: 75, a: 9, b: 17 },
      { L: 62, a: 13, b: 19 },
      { L: 40, a: 14, b: 22 },
      { L: 22, a: 8, b: 10 },
    ]) {
      const back = srgbToLab(labToSrgb(lab));
      expect(back.L).toBeCloseTo(lab.L, 9);
      expect(back.a).toBeCloseTo(lab.a, 9);
      expect(back.b).toBeCloseTo(lab.b, 9);
    }
  });

  it("white, black and greys come back exactly (to 1e-9)", () => {
    for (const v of [0, 1, 10, 64, 128, 200, 255]) {
      const back = labToSrgb(srgbToLab({ r: v, g: v, b: v }));
      for (const ch of [back.r, back.g, back.b]) expect(Math.abs(ch - v)).toBeLessThan(1e-9);
    }
  });

  it("matches culori's lab65 → rgb to within one 8-bit step", () => {
    // culori derives its matrix from chromaticities (see culori.crosscheck.test.ts), so the two
    // differ slightly. Over 20,000 random colours the largest difference measured was 0.43 of a
    // channel step (0–255 units), in dark saturated colours; skin colours differ far less.
    // One step leaves ~2× headroom: a hex value can differ by at most 1.
    const toRgb = converter("rgb");
    for (const c of SAMPLES.slice(0, 2000)) {
      const lab = srgbToLab(c);
      const ref = toRgb({ mode: "lab65", l: lab.L, a: lab.a, b: lab.b });
      const ours = labToSrgb(lab);
      expect(Math.abs(ours.r - ref.r * 255)).toBeLessThan(1);
      expect(Math.abs(ours.g - ref.g * 255)).toBeLessThan(1);
      expect(Math.abs(ours.b - ref.b * 255)).toBeLessThan(1);
    }
  });
});

describe("out of gamut", () => {
  it("a very saturated Lab colour is reported out of gamut and clamped by rgbToHex", () => {
    const rgb = labToSrgb({ L: 50, a: 120, b: -120 });
    expect(inSrgbGamut(rgb)).toBe(false);
    const hex = rgbToHex(rgb);
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    const back = hexToRgb(hex);
    for (const ch of [back.r, back.g, back.b]) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }
  });

  it("L* above 100 is brighter than white and out of gamut", () => {
    expect(inSrgbGamut(labToSrgb({ L: 110, a: 0, b: 0 }))).toBe(false);
    expect(rgbToHex(labToSrgb({ L: 110, a: 0, b: 0 }))).toBe("#ffffff");
  });

  it("tolerates floating-point noise at the cube's edges", () => {
    expect(inSrgbGamut({ r: -1e-9, g: 255 + 1e-9, b: 0 })).toBe(true);
    expect(inSrgbGamut({ r: -0.01, g: 0, b: 0 })).toBe(false);
  });
});

describe("rgbToHex", () => {
  it("rounds, pads and lowercases", () => {
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
    expect(rgbToHex({ r: 10.4, g: 10.5, b: 171.2 })).toBe("#0a0bab");
    expect(rgbToHex({ r: -3, g: 300, b: 15 })).toBe("#00ff0f");
  });

  it("is the inverse of hexToRgb", () => {
    for (const hex of ["#d4af37", "#c0c0c0", "#7b1e28", "#f6ede4"]) {
      expect(rgbToHex(hexToRgb(hex))).toBe(hex);
    }
  });
});
