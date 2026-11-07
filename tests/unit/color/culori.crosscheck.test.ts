import { converter, type Rgb } from "culori";
import { describe, expect, it } from "vitest";
import {
  chroma,
  hueAngle,
  linearRgbToXyz,
  srgbToLab,
  srgbToLinear,
  type Rgb255,
} from "@/lib/color";
import { mulberry32, randInt } from "./prng";

/**
 * Cross-check against culori (dev dependency only), an independent implementation.
 *
 * culori derives its sRGB→XYZ matrix from the primaries' chromaticities and uses
 * D65 = (0.3127/0.329, 1, …); we use Lindbloom's published 7-decimal matrix with
 * D65 = (0.95047, 1, 1.08883). Over 20,000 random colours the largest differences
 * measured were 2.3e-4 (XYZ), 0.011 (any of L*, a*, b*) and 0.011° (hue). Tolerances leave
 * ~2× headroom; anything beyond them is a real bug, not rounding.
 */
const TOL_LINEAR = 1e-12;
const TOL_XYZ = 5e-4;
const TOL_LAB = 0.02;
const TOL_HUE_DEG = 0.05;
/** Hue is numerically unstable near the neutral axis; only compare it above this chroma. */
const MIN_CHROMA_FOR_HUE = 1;

const toLrgb = converter("lrgb");
const toXyz = converter("xyz65");
const toLab = converter("lab65");
const toLch = converter("lch65");

const asCulori = ({ r, g, b }: Rgb255): Rgb => ({
  mode: "rgb",
  r: r / 255,
  g: g / 255,
  b: b / 255,
});

function samples(): Rgb255[] {
  const rand = mulberry32(0x70e3a7c4);
  const out: Rgb255[] = [];
  // Uniform over the whole sRGB cube.
  for (let i = 0; i < 2000; i++) {
    out.push({ r: randInt(rand, 0, 255), g: randInt(rand, 0, 255), b: randInt(rand, 0, 255) });
  }
  // Concentrated in the skin range (r ≥ g ≥ b, light to deep), where accuracy matters most.
  for (let i = 0; i < 1000; i++) {
    const r = randInt(rand, 45, 255);
    const g = randInt(rand, Math.round(r * 0.55), Math.round(r * 0.92));
    const b = randInt(rand, Math.round(g * 0.6), g);
    out.push({ r, g, b });
  }
  return out;
}

const SAMPLES = samples();

describe(`cross-check against culori (${SAMPLES.length} seeded samples)`, () => {
  it("linear RGB matches culori lrgb", () => {
    for (const c of SAMPLES) {
      const ours = srgbToLinear(c);
      const ref = toLrgb(asCulori(c));
      expect(Math.abs(ours.r - ref.r)).toBeLessThan(TOL_LINEAR);
      expect(Math.abs(ours.g - ref.g)).toBeLessThan(TOL_LINEAR);
      expect(Math.abs(ours.b - ref.b)).toBeLessThan(TOL_LINEAR);
    }
  });

  it("XYZ matches culori xyz65", () => {
    for (const c of SAMPLES) {
      const ours = linearRgbToXyz(srgbToLinear(c));
      const ref = toXyz(asCulori(c));
      expect(Math.abs(ours.x - ref.x)).toBeLessThan(TOL_XYZ);
      expect(Math.abs(ours.y - ref.y)).toBeLessThan(TOL_XYZ);
      expect(Math.abs(ours.z - ref.z)).toBeLessThan(TOL_XYZ);
    }
  });

  it("CIELAB matches culori lab65", () => {
    for (const c of SAMPLES) {
      const ours = srgbToLab(c);
      const ref = toLab(asCulori(c));
      expect(Math.abs(ours.L - ref.l)).toBeLessThan(TOL_LAB);
      expect(Math.abs(ours.a - ref.a)).toBeLessThan(TOL_LAB);
      expect(Math.abs(ours.b - ref.b)).toBeLessThan(TOL_LAB);
    }
  });

  it("chroma and hue match culori lch65", () => {
    let hueCompared = 0;
    for (const c of SAMPLES) {
      const ours = srgbToLab(c);
      const ref = toLch(asCulori(c));
      expect(Math.abs(chroma(ours) - ref.c)).toBeLessThan(TOL_LAB);
      if (ref.c >= MIN_CHROMA_FOR_HUE && ref.h !== undefined) {
        const d = Math.abs(hueAngle(ours) - ref.h);
        expect(Math.min(d, 360 - d)).toBeLessThan(TOL_HUE_DEG);
        hueCompared++;
      }
    }
    expect(hueCompared).toBeGreaterThan(SAMPLES.length * 0.9);
  });
});
