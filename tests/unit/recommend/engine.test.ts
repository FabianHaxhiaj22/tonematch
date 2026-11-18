import { describe, expect, it } from "vitest";
import type { UndertoneLabel } from "@/lib/analysis/undertone";
import { LOW_CONFIDENCE_THRESHOLD } from "@/lib/recommend/config";
import {
  blendedScore,
  direction,
  fromScoreResult,
  recommend,
  tierFor,
  type Recommendation,
} from "@/lib/recommend/engine";
import { CATEGORIES, DEPTHS, UNDERTONES, type Tier } from "@/lib/recommend/schema";
import type { ScoreResult } from "@/lib/analysis/score";
import { CONFIDENT, DATA, UNCERTAIN, cloneData, input, mstsFor } from "./helpers";

const tiersOf = (r: Recommendation) => Object.fromEntries(r.metals.map((m) => [m.id, m.tier]));
const familyOf = (id: string) => DATA.metals.find((m) => m.id === id)!.family;
const bestFamilies = (r: Recommendation) =>
  new Set(r.metals.filter((m) => m.tier === "best").map((m) => familyOf(m.id)));

/**
 * Expected metal tiers for each undertone at normal confidence (README §7.2 with the D-030
 * rules). The same table must hold at every depth.
 */
const EXPECTED: Record<UndertoneLabel, Record<string, Tier>> = {
  warm: {
    "yellow-gold": "best",
    "rose-gold": "best",
    "copper-brass": "good",
    "mixed-metals": "good",
    silver: "care",
    "white-gold": "care",
    platinum: "care",
  },
  "neutral-warm": {
    "yellow-gold": "best",
    "rose-gold": "best",
    "mixed-metals": "best",
    "copper-brass": "good",
    silver: "good",
    "white-gold": "good",
    platinum: "good",
  },
  neutral: {
    "yellow-gold": "best",
    silver: "best",
    "rose-gold": "best",
    "white-gold": "best",
    platinum: "best",
    "mixed-metals": "best",
    "copper-brass": "good",
  },
  "neutral-cool": {
    silver: "best",
    "white-gold": "best",
    platinum: "best",
    "mixed-metals": "best",
    "rose-gold": "good",
    "yellow-gold": "good",
    // Its blended score is "care"; the lean guard keeps the other family at "good".
    "copper-brass": "good",
  },
  cool: {
    silver: "best",
    "white-gold": "best",
    platinum: "best",
    "rose-gold": "good",
    "mixed-metals": "good",
    "yellow-gold": "care",
    "copper-brass": "care",
  },
};

describe("every undertone × depth (normal confidence)", () => {
  for (const undertone of UNDERTONES) {
    for (const depth of DEPTHS) {
      it(`${undertone} × ${depth}`, () => {
        const r = recommend(input(undertone, depth), DATA);
        expect(tiersOf(r)).toEqual(EXPECTED[undertone]);
        expect(r.metals).toHaveLength(DATA.metals.length);
        expect(r.undertone).toBe(undertone);
        expect(r.depth).toBe(depth);
        expect(r.summaryKey).toBe(`recommend.summary.${undertone}`);
        expect(r.finishKey).toBe(DATA.styles.finishes[depth]);
        expect(r.gemstones.length).toBeGreaterThan(0);
        for (const category of CATEGORIES) {
          expect(r.styles[category].length, category).toBeGreaterThan(0);
          expect(r.styles[category].length, category).toBeLessThanOrEqual(3);
        }
        // Tiers are listed best → good → care.
        const ranks = r.metals.map((m) => ["best", "good", "care"].indexOf(m.tier));
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
        // Each metal's reason comes from the templates for its tier.
        for (const m of r.metals) expect(m.reasonKey).toMatch(new RegExp(`\\.${m.tier}$`));
      });
    }
  }
});

describe("depth only changes finish/contrast advice", () => {
  for (const undertone of UNDERTONES) {
    for (const confidence of [CONFIDENT, UNCERTAIN]) {
      it(`${undertone} @ ${confidence}: metals, gemstones, summary and notes identical at every depth and MST`, () => {
        const ref = recommend(input(undertone, "very-light", confidence), DATA);
        for (const depth of DEPTHS) {
          for (const mst of mstsFor(depth)) {
            const r = recommend({ ...input(undertone, depth, confidence), mstApprox: mst }, DATA);
            expect(r.metals).toEqual(ref.metals);
            expect(r.gemstones).toEqual(ref.gemstones);
            expect(r.summaryKey).toBe(ref.summaryKey);
            expect(r.notes).toEqual(ref.notes);
          }
        }
      });
    }
  }

  it("finish advice follows depth and ignores undertone", () => {
    const finishes = DEPTHS.map((d) => recommend(input("warm", d), DATA).finishKey);
    expect(finishes).toEqual([
      "styles.finishes.lighter",
      "styles.finishes.lighter",
      "styles.finishes.medium",
      "styles.finishes.medium",
      "styles.finishes.deeper",
      "styles.finishes.deeper",
    ]);
    for (const u of UNDERTONES) {
      expect(DEPTHS.map((d) => recommend(input(u, d), DATA).finishKey)).toEqual(finishes);
    }
  });

  it("lighter depths get delicate pieces, deeper depths bolder ones", () => {
    const tags = (depth: (typeof DEPTHS)[number]) =>
      CATEGORIES.flatMap((c) =>
        recommend(input("warm", depth), DATA).styles[c].flatMap((s) => s.tags),
      );
    expect(tags("very-light")).toContain("delicate");
    expect(tags("very-light")).not.toContain("statement");
    expect(tags("very-deep")).toContain("statement");
    expect(tags("very-deep")).not.toContain("delicate");
  });
});

describe("leaning and directional results", () => {
  it("warm and cool list their own family first", () => {
    expect(familyOf(recommend(input("warm", "medium"), DATA).metals[0]!.id)).toBe("warm");
    expect(familyOf(recommend(input("cool", "medium"), DATA).metals[0]!.id)).toBe("cool");
  });

  for (const [undertone, lean, other] of [
    ["neutral-warm", "warm", "cool"],
    ["neutral-cool", "cool", "warm"],
  ] as const) {
    it(`${undertone}: ${lean} metals lead, ${other} metals stay at least "good"`, () => {
      const r = recommend(input(undertone, "tan"), DATA);
      expect(familyOf(r.metals[0]!.id)).toBe(lean);
      for (const m of r.metals.filter((x) => familyOf(x.id) === other)) {
        expect(m.tier, m.id).not.toBe("care");
        expect(m.reasonKey).toMatch(/^recommend\.reasons\.other\./);
      }
      expect(r.notes).not.toContain("bothCanWork");
    });
  }

  it("the lean guard holds even if the data says otherwise", () => {
    const data = cloneData();
    for (const m of data.metals)
      if (m.family === "warm") m.affinity = { cool: 0, neutral: 0, warm: 0 };
    const r = recommend(input("neutral-cool", "deep"), data);
    for (const m of r.metals.filter((x) => familyOf(x.id) === "warm")) expect(m.tier).toBe("good");
  });

  it("the favoured family always has a best metal, even with weak data", () => {
    const data = cloneData();
    for (const m of data.metals) if (m.family === "warm") m.affinity.warm = 0.6;
    data.metals.find((m) => m.id === "rose-gold")!.affinity.warm = 0.7;
    const r = recommend(input("warm", "light"), data);
    expect(r.metals[0]).toMatchObject({ id: "rose-gold", tier: "best" });
    expect(r.metals.filter((m) => m.tier === "best")).toHaveLength(1);
  });
});

describe("neutral (confident)", () => {
  it("shows both families as best with the bothCanWork note", () => {
    const r = recommend(input("neutral", "medium"), DATA);
    expect(bestFamilies(r)).toEqual(new Set(["warm", "cool", "mixed"]));
    expect(r.notes).toEqual(["bothCanWork"]);
    expect(r.summaryKey).toBe("recommend.summary.neutral");
    expect(r.metals.find((m) => m.id === "silver")!.reasonKey).toBe(
      "recommend.reasons.balanced.best",
    );
    expect(r.metals.find((m) => m.id === "mixed-metals")!.reasonKey).toBe(
      "recommend.reasons.mixed.best",
    );
  });
});

describe("low confidence: both families, no ranking between them", () => {
  const balanced = recommend(input("neutral", "medium"), DATA);

  for (const undertone of UNDERTONES) {
    it(`${undertone} below the threshold`, () => {
      const r = recommend(input(undertone, "medium", UNCERTAIN), DATA);
      // Same metals, order and gemstones whatever M4 said: the undertone has no influence.
      expect(r.metals).toEqual(balanced.metals);
      expect(r.gemstones).toEqual(balanced.gemstones);
      expect(bestFamilies(r)).toContain("warm");
      expect(bestFamilies(r)).toContain("cool");
      expect(r.notes).toContain("bothCanWorkUncertain");
      expect(r.notes).not.toContain("bothCanWork");
      expect(r.summaryKey).toBe("recommend.summary.uncertain");
      // M4's label is still reported honestly.
      expect(r.undertone).toBe(undertone);
      expect(r.confidence).toBe(UNCERTAIN);
    });
  }

  it("best metals alternate families in data order, so neither family is listed as the winner", () => {
    const r = recommend(input("warm", "deep", 0.1), DATA);
    const best = r.metals.filter((m) => m.tier === "best").map((m) => m.id);
    expect(best).toEqual([
      "yellow-gold",
      "silver",
      "rose-gold",
      "white-gold",
      "platinum",
      "mixed-metals",
    ]);
  });

  it("both families get a best metal even when the neutral column is lopsided", () => {
    const data = cloneData();
    for (const m of data.metals) if (m.family === "cool") m.affinity.neutral = 0.3;
    const r = recommend(input("warm", "light", UNCERTAIN), data);
    expect(bestFamilies(r)).toContain("cool");
    expect(r.metals.find((m) => m.id === "silver")!.tier).toBe("best");
  });

  it("exactly at the threshold ranks normally", () => {
    const r = recommend(input("warm", "medium", LOW_CONFIDENCE_THRESHOLD), DATA);
    expect(tiersOf(r)).toEqual(EXPECTED.warm);
    expect(r.notes).not.toContain("bothCanWorkUncertain");
    expect(r.summaryKey).toBe("recommend.summary.warm");
  });

  it("styles use the effective (neutral) undertone", () => {
    const r = recommend(input("warm", "medium", UNCERTAIN), DATA);
    const ids = CATEGORIES.flatMap((c) => r.styles[c].map((s) => s.id));
    expect(ids).toContain("mixed-stack");
    const confident = recommend(input("warm", "medium"), DATA);
    expect(CATEGORIES.flatMap((c) => confident.styles[c].map((s) => s.id))).not.toContain(
      "mixed-stack",
    );
  });
});

describe("gemstones follow §7.2", () => {
  it("warm and cool palettes", () => {
    expect(recommend(input("warm", "tan"), DATA).gemstones).toEqual([
      "garnet",
      "citrine",
      "amber",
      "peridot",
      "coral",
      "turquoise",
    ]);
    expect(recommend(input("cool", "tan"), DATA).gemstones).toEqual([
      "sapphire",
      "emerald",
      "ruby",
      "amethyst",
      "aquamarine",
      "pearl",
    ]);
  });

  it("neutral gets jewel tones and pastels from both palettes", () => {
    const gems = recommend(input("neutral", "tan"), DATA).gemstones;
    expect(gems).toEqual(["garnet", "emerald", "ruby", "amethyst", "aquamarine", "pearl"]);
  });
});

describe("notes", () => {
  it("keeps M4's notes first, without duplicates", () => {
    const r = recommend(
      input("neutral", "light", UNCERTAIN, [
        "photoQuizDisagree",
        "photoQuizDisagree",
        "noQuizAnswers",
      ]),
      DATA,
    );
    expect(r.notes).toEqual(["photoQuizDisagree", "noQuizAnswers", "bothCanWorkUncertain"]);
  });

  it("adds nothing for a confident directional result", () => {
    expect(recommend(input("cool", "deep", 0.9, ["lowPhotoConfidence"]), DATA).notes).toEqual([
      "lowPhotoConfidence",
    ]);
  });
});

describe("input checks", () => {
  it.each([-0.01, 1.01, Number.NaN, Number.POSITIVE_INFINITY])("rejects confidence %s", (c) => {
    expect(() => recommend(input("warm", "medium", c), DATA)).toThrow(RangeError);
  });

  it("accepts confidence 0 and 1", () => {
    expect(recommend(input("warm", "medium", 0), DATA).notes).toContain("bothCanWorkUncertain");
    expect(recommend(input("warm", "medium", 1), DATA).notes).toEqual([]);
  });

  it.each([0, 11, 2.5])("rejects MST %s", (mst) => {
    expect(() => recommend({ ...input("warm", "medium"), mstApprox: mst }, DATA)).toThrow(
      RangeError,
    );
  });

  it("rejects an MST that doesn't belong to the depth label", () => {
    expect(() => recommend({ ...input("warm", "very-light"), mstApprox: 9 }, DATA)).toThrow(
      /MST 9/,
    );
  });
});

describe("helpers", () => {
  it("blends affinity columns per bucket", () => {
    const a = { cool: 0.2, neutral: 0.6, warm: 1 };
    expect(blendedScore(a, "cool")).toBeCloseTo(0.2);
    expect(blendedScore(a, "neutral-cool")).toBeCloseTo(0.4);
    expect(blendedScore(a, "neutral")).toBeCloseTo(0.6);
    expect(blendedScore(a, "neutral-warm")).toBeCloseTo(0.8);
    expect(blendedScore(a, "warm")).toBeCloseTo(1);
  });

  it("tiers from the cut-points", () => {
    expect(tierFor(0.8)).toBe("best");
    expect(tierFor(0.79)).toBe("good");
    expect(tierFor(0.55)).toBe("good");
    expect(tierFor(0.54)).toBe("care");
  });

  it("direction of each bucket", () => {
    expect(UNDERTONES.map(direction)).toEqual(["cool", "cool", null, "warm", "warm"]);
  });

  it("fromScoreResult maps M4's result", () => {
    const score = {
      depth: { label: "tan", mstApprox: 6, angle: 20, ita: 22, method: "blend" },
      undertone: { label: "neutral-warm" },
      confidence: 0.62,
      notes: ["noQuizAnswers"],
    } as unknown as ScoreResult;
    expect(fromScoreResult(score)).toEqual({
      undertone: "neutral-warm",
      depth: "tan",
      mstApprox: 6,
      confidence: 0.62,
      notes: ["noQuizAnswers"],
    });
  });
});
