import { describe, expect, it } from "vitest";
import type { Lab } from "@/lib/color";
import {
  CHEEK_CHROMATIC_DISAGREEMENT,
  CHEEK_REDNESS_A_MARGIN,
  FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL,
  REGION_WEIGHTS,
} from "@/lib/analysis/config";
import { REGION_NAMES } from "@/lib/analysis/regions";
import { cheekRedderThanForehead, chooseRegionWeights } from "@/lib/analysis/weights";

/** A Lab colour from L*, chroma and hue angle (degrees). */
const lch = (L: number, C: number, h: number): Lab => ({
  L,
  a: C * Math.cos((h * Math.PI) / 180),
  b: C * Math.sin((h * Math.PI) / 180),
});

/** Skin across the depth range, same moderate hue. */
const SKINS: Record<string, Lab> = {
  veryLight: lch(75, 18, 58),
  medium: lch(60, 22, 57),
  deep: lch(40, 20, 55),
  veryDeep: lch(28, 15, 54),
};

const sum = (w: Record<string, number>) => Object.values(w).reduce((s, v) => s + v, 0);

describe("cheekRedderThanForehead", () => {
  it("flags a cheek clearly redder than the forehead (a* or hue)", () => {
    const forehead = lch(60, 20, 58);
    expect(
      cheekRedderThanForehead(
        { ...forehead, a: forehead.a + CHEEK_REDNESS_A_MARGIN + 1 },
        forehead,
      ),
    ).toBe(true);
    expect(cheekRedderThanForehead(lch(60, 20, 45), forehead)).toBe(true); // 13° lower hue
  });

  it("does not flag cheeks that match the forehead, or are only slightly different", () => {
    const forehead = lch(60, 20, 58);
    expect(cheekRedderThanForehead(forehead, forehead)).toBe(false);
    expect(cheekRedderThanForehead(lch(58, 21, 54), forehead)).toBe(false); // 4° lower, a* +1.4
  });

  it.each(Object.entries(SKINS))(
    "%s skin without makeup is not flagged (natural cheek/forehead variation)",
    (_name, skin) => {
      // Cheeks a little darker and slightly redder, as unmade-up skin often is.
      const cheek = lch(
        skin.L - 3,
        Math.hypot(skin.a, skin.b) + 1,
        (Math.atan2(skin.b, skin.a) * 180) / Math.PI - 3,
      );
      expect(cheekRedderThanForehead(cheek, skin)).toBe(false);
    },
  );

  it("handles hue wrap-around (a pink cheek just below 0° vs a forehead at 10°)", () => {
    expect(cheekRedderThanForehead(lch(60, 10, 355), lch(60, 10, 10))).toBe(true);
  });
});

describe("chooseRegionWeights", () => {
  const ok = lch(60, 20, 57);
  const medians = { rightCheek: ok, leftCheek: ok, forehead: ok };

  it("uses the normal weights when nothing is wrong", () => {
    const r = chooseRegionWeights({ medians, usable: REGION_NAMES, cheekChromatic: 0 });
    expect(r.reasons).toEqual([]);
    expect(r.weights).toEqual(REGION_WEIGHTS);
  });

  it("renormalises the normal weights over usable regions", () => {
    const r = chooseRegionWeights({
      medians,
      usable: ["rightCheek", "leftCheek"],
      cheekChromatic: 0,
    });
    expect(r.weights).toEqual({ rightCheek: 0.5, leftCheek: 0.5, forehead: 0 });
    expect(r.reasons).toEqual([]); // no forehead: nothing to compare with or shift towards
  });

  it("gives the forehead more weight when the cheeks look redder (blush or flushing)", () => {
    const red = lch(58, 26, 45);
    const r = chooseRegionWeights({
      medians: { rightCheek: red, leftCheek: red, forehead: ok },
      usable: REGION_NAMES,
      cheekChromatic: 0,
    });
    expect(r.reasons).toEqual(["cheekRedness"]);
    expect(r.weights.forehead).toBe(FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL);
    expect(r.weights.rightCheek).toBeCloseTo((1 - FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL) / 2, 12);
    expect(sum(r.weights)).toBeCloseTo(1, 12);
  });

  it("gives the forehead more weight when one cheek was dropped", () => {
    const r = chooseRegionWeights({
      medians,
      usable: ["leftCheek", "forehead"],
      cheekChromatic: null,
    });
    expect(r.reasons).toEqual(["cheekDropped"]);
    expect(r.weights).toEqual({
      rightCheek: 0,
      leftCheek: 1 - FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL,
      forehead: FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL,
    });
  });

  it("gives the forehead more weight when the cheeks disagree in colour", () => {
    const r = chooseRegionWeights({
      medians,
      usable: REGION_NAMES,
      cheekChromatic: CHEEK_CHROMATIC_DISAGREEMENT + 0.5,
    });
    expect(r.reasons).toEqual(["cheekDisagreement"]);
    expect(r.weights.forehead).toBe(FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL);
  });

  it("cheeks differing mostly in b* count as disagreement (synthetic case: b* 10 vs 7, Δa* 1)", () => {
    const chromatic = Math.hypot(1, 10 - 7); // ≈ 3.16
    expect(chromatic).toBeGreaterThan(CHEEK_CHROMATIC_DISAGREEMENT);
  });

  it("lists every reason that applies", () => {
    const red = lch(58, 26, 45);
    const r = chooseRegionWeights({
      medians: { rightCheek: null, leftCheek: red, forehead: ok },
      usable: ["leftCheek", "forehead"],
      cheekChromatic: null,
    });
    expect(r.reasons).toEqual(["cheekRedness", "cheekDropped"]);
  });

  it("falls back to the forehead alone when no cheek is usable", () => {
    const r = chooseRegionWeights({ medians, usable: ["forehead"], cheekChromatic: null });
    expect(r.weights).toEqual({ rightCheek: 0, leftCheek: 0, forehead: 1 });
  });

  it("returns all zeros when nothing is usable", () => {
    const r = chooseRegionWeights({ medians, usable: [], cheekChromatic: null });
    expect(r.weights).toEqual({ rightCheek: 0, leftCheek: 0, forehead: 0 });
  });
});
