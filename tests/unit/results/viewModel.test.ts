import { describe, expect, it } from "vitest";
import { MST_SWATCHES } from "@/lib/analysis/config";
import { scorePhoto } from "@/lib/analysis/score";
import { hexToRgb, labToSrgb, rgbToHex } from "@/lib/color";
import en from "@/i18n/messages/en.json";
import { flattenMessages } from "@/i18n/messages";
import { CATEGORIES, loadRecommendData, TIERS } from "@/lib/recommend";
import { fromScoreResult, recommend } from "@/lib/recommend/engine";
import { buildResultsView, toPercent } from "@/lib/results";
import { COOL_SKIN, EVIDENCE, NEUTRAL_SKIN, SPLIT, WARM_SKIN, all } from "./fixtures";

const DATA = loadRecommendData();
const EN = flattenMessages(en);

describe("buildResultsView: a confident warm result", () => {
  const view = buildResultsView(WARM_SKIN, all("warm"), DATA);

  it("reports M4's labels and the confidence as a whole percentage", () => {
    const score = scorePhoto(WARM_SKIN, all("warm"));
    expect(view.uncertain).toBe(false);
    expect(view.undertone).toBe("warm");
    expect(view.depth).toBe(score.depth.label);
    expect(view.mstApprox).toBe(score.depth.mstApprox);
    expect(view.confidencePercent).toBe(Math.round(score.confidence * 100));
    expect(view.confidencePercent).toBe(85); // the uncalibrated cap (D-029)
  });

  it("shows the sampled skin colour converted back to sRGB", () => {
    expect(view.skinHex).toBe(rgbToHex(labToSrgb(WARM_SKIN.skin)));
    expect(view.skinHex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("groups metals by tier in order, with names, swatches and reasons from the data", () => {
    const rec = recommend(fromScoreResult(scorePhoto(WARM_SKIN, all("warm"))), DATA);
    expect(view.metalTiers.map((t) => t.tier)).toEqual(["best", "good", "care"]);
    // Same metals in the same order as the engine.
    expect(view.metalTiers.flatMap((t) => t.metals.map((m) => m.id))).toEqual(
      rec.metals.map((m) => m.id),
    );
    expect(view.metalTiers[0]!.metals.map((m) => m.id)).toEqual(["yellow-gold", "rose-gold"]);
    for (const t of view.metalTiers) {
      for (const m of t.metals) {
        const metal = DATA.metals.find((d) => d.id === m.id)!;
        expect(m.nameKey).toBe(metal.nameKey);
        expect(m.swatch).toEqual(metal.swatch);
        expect(EN[m.reasonKey], m.reasonKey).toBeDefined();
      }
    }
  });

  it("has all four style categories in order, each with suggestions", () => {
    expect(view.styles.map((s) => s.category)).toEqual([...CATEGORIES]);
    for (const s of view.styles) {
      expect(s.items.length).toBeGreaterThan(0);
      for (const item of s.items) expect(EN[item.labelKey], item.labelKey).toBeDefined();
    }
  });

  it("lists gemstones with names and swatches, and a warm palette", () => {
    expect(view.gemstones.length).toBeGreaterThan(0);
    for (const g of view.gemstones) {
      expect(EN[g.nameKey]).toBeDefined();
      expect(() => hexToRgb(g.swatch)).not.toThrow();
    }
    expect(view.palette).toBe("warm");
  });

  it("has summary and finish keys that exist, and no lead note", () => {
    expect(EN[view.summaryKey]).toBeDefined();
    expect(EN[view.finishKey]).toBeDefined();
    expect(view.leadNote).toBeNull();
    expect(view.notes).toEqual([]);
  });

  it("carries the ten official MST swatches for the scale strip", () => {
    expect(view.mstScale).toHaveLength(10);
    expect(view.mstScale.map((s) => s.hex)).toEqual([...MST_SWATCHES]);
    expect(view.mstScale.map((s) => s.mst)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("buildResultsView: other outcomes", () => {
  it("a confident cool result has a cool palette and cool metals first", () => {
    const view = buildResultsView(COOL_SKIN, all("cool"), DATA);
    expect(view.undertone).toBe("cool");
    expect(view.uncertain).toBe(false);
    expect(view.palette).toBe("cool");
    expect(view.metalTiers[0]!.metals.map((m) => m.id)).toContain("silver");
  });

  it("a neutral result is balanced and keeps the 'both can work' note among the others", () => {
    const view = buildResultsView(NEUTRAL_SKIN, all("neutral"), DATA);
    expect(view.undertone).toBe("neutral");
    expect(view.uncertain).toBe(false);
    expect(view.palette).toBe("balanced");
    expect(view.leadNote).toBeNull();
    expect(view.notes).toEqual(["bothCanWork"]);
  });

  it("photo-only results keep the engine's notes in order", () => {
    const view = buildResultsView(NEUTRAL_SKIN, {}, DATA);
    expect(view.notes).toEqual(["noQuizAnswers", "bothCanWork"]);
  });

  it("a disagreement keeps photoQuizDisagree as a note", () => {
    const view = buildResultsView(WARM_SKIN, all("cool"), DATA);
    expect(view.notes).toContain("photoQuizDisagree");
  });
});

describe("buildResultsView: low confidence", () => {
  it.each([
    ["warm", WARM_SKIN],
    ["cool", COOL_SKIN],
    ["neutral", NEUTRAL_SKIN],
  ] as const)(
    "a split quiz with a %s photo is uncertain and leads with 'both can work'",
    (_, s) => {
      const view = buildResultsView(s, SPLIT, DATA);
      expect(view.confidencePercent).toBeLessThan(50);
      expect(view.uncertain).toBe(true);
      expect(view.leadNote).toBe("bothCanWorkUncertain");
      expect(view.notes).not.toContain("bothCanWorkUncertain");
      expect(view.palette).toBe("balanced");
      expect(view.summaryKey).toBe("recommend.summary.uncertain");
    },
  );

  it("still reports the undertone reading, and both families have a 'best' metal", () => {
    const view = buildResultsView(COOL_SKIN, SPLIT, DATA);
    expect(view.undertone).toBe("neutral-cool");
    const best = view.metalTiers.find((t) => t.tier === "best")!.metals.map((m) => m.id);
    const family = (id: string) => DATA.metals.find((m) => m.id === id)!.family;
    expect(best.map(family)).toEqual(expect.arrayContaining(["warm", "cool"]));
  });

  it("the metals are identical whatever the photo read (no family ranked first)", () => {
    const ids = (s: typeof WARM_SKIN) =>
      buildResultsView(s, SPLIT, DATA).metalTiers.map((t) => [t.tier, t.metals.map((m) => m.id)]);
    expect(ids(WARM_SKIN)).toEqual(ids(COOL_SKIN));
    expect(ids(WARM_SKIN)).toEqual(ids(NEUTRAL_SKIN));
  });
});

describe("buildResultsView: across depths", () => {
  it.each([
    { L: 80, a: 8, b: 18 },
    { L: 70, a: 10, b: 20 },
    { L: 55, a: 13, b: 22 },
    { L: 45, a: 14, b: 22 },
    { L: 33, a: 12, b: 18 },
    { L: 22, a: 8, b: 12 },
  ])("L* $L gives a complete view with a valid skin swatch", (skin) => {
    const view = buildResultsView({ skin, evidence: EVIDENCE }, all("warm"), DATA);
    expect(view.skinHex).toMatch(/^#[0-9a-f]{6}$/);
    expect(view.mstApprox).toBeGreaterThanOrEqual(1);
    expect(view.mstApprox).toBeLessThanOrEqual(10);
    expect(view.styles).toHaveLength(4);
    expect(view.metalTiers.every((t) => TIERS.includes(t.tier) && t.metals.length > 0)).toBe(true);
  });

  it("deeper skin gives a higher MST index and a darker swatch", () => {
    const light = buildResultsView({ skin: { L: 75, a: 9, b: 18 }, evidence: EVIDENCE }, {}, DATA);
    const deep = buildResultsView({ skin: { L: 30, a: 11, b: 16 }, evidence: EVIDENCE }, {}, DATA);
    expect(deep.mstApprox).toBeGreaterThan(light.mstApprox);
    expect(hexToRgb(deep.skinHex).g).toBeLessThan(hexToRgb(light.skinHex).g);
  });
});

describe("toPercent", () => {
  it("rounds to whole percent and clamps to 0–100", () => {
    expect(toPercent(0.744)).toBe(74);
    expect(toPercent(0.745)).toBe(75);
    expect(toPercent(0)).toBe(0);
    expect(toPercent(1)).toBe(100);
    expect(toPercent(-0.2)).toBe(0);
    expect(toPercent(1.3)).toBe(100);
  });
});
