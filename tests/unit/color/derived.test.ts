import { describe, expect, it } from "vitest";
import { chroma, hueAngle, ita } from "@/lib/color";

const lab = (L: number, a: number, b: number) => ({ L, a, b });

describe("chroma", () => {
  it.each([
    { a: 0, b: 0, c: 0 },
    { a: 3, b: 4, c: 5 },
    { a: -3, b: -4, c: 5 },
    { a: 12, b: 0, c: 12 },
  ])("C*(a=$a, b=$b) = $c", ({ a, b, c }) => {
    expect(chroma(lab(50, a, b))).toBeCloseTo(c, 12);
  });
});

describe("hueAngle", () => {
  it.each([
    { a: 1, b: 0, h: 0 },
    { a: 1, b: 1, h: 45 },
    { a: 0, b: 1, h: 90 },
    { a: -1, b: 0, h: 180 },
    { a: -1, b: -1, h: 225 },
    { a: 0, b: -1, h: 270 },
    { a: 1, b: -1, h: 315 },
    { a: 0, b: 0, h: 0 }, // achromatic: undefined hue, returns 0 by convention
  ])("h°(a=$a, b=$b) = $h", ({ a, b, h }) => {
    expect(hueAngle(lab(50, a, b))).toBeCloseTo(h, 10);
  });

  it("always returns a value in [0, 360)", () => {
    for (let deg = -720; deg <= 720; deg += 7) {
      const rad = (deg * Math.PI) / 180;
      const h = hueAngle(lab(50, Math.cos(rad), Math.sin(rad)));
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThan(360);
    }
  });

  it("is higher for yellower (warmer) skin than for pinker (cooler) skin", () => {
    expect(hueAngle(lab(65, 10, 22))).toBeGreaterThan(hueAngle(lab(65, 14, 12)));
  });
});

describe("ita", () => {
  const MIN_B = 1; // test value; the real threshold comes from analysis config (ITA_MIN_B)

  it.each([
    { L: 60, b: 20, ita: (Math.atan(10 / 20) * 180) / Math.PI }, // 26.565°
    { L: 50, b: 15, ita: 0 },
    { L: 30, b: 20, ita: -45 },
    { L: 90, b: 10, ita: (Math.atan(40 / 10) * 180) / Math.PI }, // 75.96°: very light
    { L: 25, b: 12, ita: (Math.atan(-25 / 12) * 180) / Math.PI }, // −64.36°: very deep
  ])("ITA°(L*=$L, b*=$b) = $ita", ({ L, b, ita: expected }) => {
    expect(ita(lab(L, 10, b), MIN_B)).toBeCloseTo(expected, 10);
  });

  it("computes ITA when b* is exactly the minimum", () => {
    expect(ita(lab(60, 0, MIN_B), MIN_B)).toBeCloseTo((Math.atan(10) * 180) / Math.PI, 10);
  });

  describe("b* ≈ 0 guard: returns null instead of dividing by ~0", () => {
    it.each([{ b: 0 }, { b: 0.5 }, { b: 0.999 }, { b: -5 }, { b: Number.NaN }])(
      "b* = $b → null",
      ({ b }) => {
        expect(ita(lab(60, 10, b), MIN_B)).toBeNull();
      },
    );
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects an invalid minB (%s)", (minB) => {
    expect(() => ita(lab(60, 10, 20), minB)).toThrow(RangeError);
  });
});
