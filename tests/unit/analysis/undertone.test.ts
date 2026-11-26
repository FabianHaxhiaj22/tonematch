import { describe, expect, it } from "vitest";
import type { Lab } from "@/lib/color";
import {
  HUE_NEUTRAL_CENTRE_DEG,
  HUE_SCALE_DEG,
  PHOTO_SCORE_CAP_CALIBRATED,
  PHOTO_SCORE_CAP_UNCALIBRATED,
  PHOTO_WEIGHT_MAX,
  QUIZ_SPLIT_SHRINK,
  UNDERTONE_CUTS,
} from "@/lib/analysis/config";
import { hueDelta } from "@/lib/analysis/stats";
import {
  QUIZ_ANSWERS,
  QUIZ_QUESTIONS,
  fuse,
  photoUndertoneScore,
  scoreQuiz,
  undertoneLabel,
  type QuizScore,
} from "@/lib/analysis/undertone";

const lch = (L: number, C: number, h: number): Lab => ({
  L,
  a: C * Math.cos((h * Math.PI) / 180),
  b: C * Math.sin((h * Math.PI) / 180),
});
const CAL = { calibrated: true };
const UNCAL = { calibrated: false };

describe("hueDelta", () => {
  it.each([
    [60, 55, 5],
    [55, 60, -5],
    [350, 10, -20],
    [10, 350, 20],
    [180, 0, 180],
    [0, 180, 180],
  ])("hueDelta(%d, %d) = %d", (a, b, d) => {
    expect(hueDelta(a, b)).toBeCloseTo(d, 9);
  });
});

describe("photoUndertoneScore (cap × tanh)", () => {
  it("is 0 at the neutral centre and follows cap × tanh(Δh / scale)", () => {
    expect(photoUndertoneScore(lch(60, 20, HUE_NEUTRAL_CENTRE_DEG), CAL)).toBeCloseTo(0, 9);
    const h = HUE_NEUTRAL_CENTRE_DEG + HUE_SCALE_DEG;
    expect(photoUndertoneScore(lch(60, 20, h), CAL)).toBeCloseTo(
      PHOTO_SCORE_CAP_CALIBRATED * Math.tanh(1),
      9,
    );
    expect(photoUndertoneScore(lch(60, 20, h), UNCAL)).toBeCloseTo(
      PHOTO_SCORE_CAP_UNCALIBRATED * Math.tanh(1),
      9,
    );
  });

  it("uncalibrated photos are capped lower than calibrated ones", () => {
    expect(PHOTO_SCORE_CAP_UNCALIBRATED).toBeLessThan(PHOTO_SCORE_CAP_CALIBRATED);
    for (const h of [20, 40, 70, 100]) {
      const lab = lch(60, 20, h);
      expect(Math.abs(photoUndertoneScore(lab, UNCAL))).toBeLessThan(
        Math.abs(photoUndertoneScore(lab, CAL)),
      );
      expect(Math.abs(photoUndertoneScore(lab, UNCAL))).toBeLessThan(PHOTO_SCORE_CAP_UNCALIBRATED);
    }
  });

  it("a cool hue outside the old ±15° clamp no longer saturates (synthetic case: uncalibrated, hue 36°)", () => {
    const p = photoUndertoneScore(lch(60, 18, 36), UNCAL);
    expect(p).toBeLessThan(0); // still cool-leaning
    expect(p).toBeGreaterThan(-0.5); // far from −1.00
    expect(p).toBeCloseTo(-PHOTO_SCORE_CAP_UNCALIBRATED * Math.tanh(19 / HUE_SCALE_DEG), 9);
  });

  it("real skin hues (about 40–70°) stay well inside ±1 even when calibrated", () => {
    for (let h = 40; h <= 70; h += 1) {
      expect(Math.abs(photoUndertoneScore(lch(60, 20, h), CAL))).toBeLessThan(0.7);
    }
  });

  it("never quite reaches the cap, even for extreme hues", () => {
    expect(photoUndertoneScore(lch(60, 20, 90), CAL)).toBeLessThan(1);
    expect(photoUndertoneScore(lch(60, 20, 0), CAL)).toBeGreaterThan(-1);
  });

  it("reads a pinkish hue just below 0° (e.g. 350°) as cool, not warm", () => {
    expect(photoUndertoneScore(lch(60, 15, 350), CAL)).toBeLessThan(-0.9);
  });

  it("depends on hue only: same hue at every depth and chroma gives the same score", () => {
    for (const opts of [CAL, UNCAL]) {
      for (const h of [40, 52, 55, 58, 70]) {
        const ref = photoUndertoneScore(lch(80, 20, h), opts);
        for (const L of [85, 70, 55, 40, 28, 18]) {
          for (const C of [8, 15, 25]) {
            expect(photoUndertoneScore(lch(L, C, h), opts)).toBeCloseTo(ref, 12);
          }
        }
      }
    }
  });
});

describe("scoreQuiz", () => {
  it("has 4 questions, each with cool / warm / neutral / not sure", () => {
    expect(QUIZ_QUESTIONS).toEqual(["veins", "daylight", "metal", "white"]);
    expect(QUIZ_ANSWERS).toEqual(["cool", "warm", "neutral", "unsure"]);
  });

  it("averages the answered questions", () => {
    expect(
      scoreQuiz({ veins: "cool", daylight: "cool", metal: "warm", white: "neutral" }).q,
    ).toBeCloseTo(-0.25, 12);
  });

  it("skips 'not sure' instead of counting it as neutral", () => {
    expect(
      scoreQuiz({ veins: "warm", daylight: "unsure", metal: "unsure", white: "unsure" }),
    ).toEqual({ q: 1, answeredCount: 1, consistency: 1 });
  });

  it("returns no score when nothing (or only 'not sure') was answered", () => {
    expect(scoreQuiz({})).toEqual({ q: null, answeredCount: 0, consistency: 1 });
    expect(
      scoreQuiz({ veins: "unsure", daylight: "unsure", metal: "unsure", white: "unsure" }),
    ).toEqual({ q: null, answeredCount: 0, consistency: 1 });
  });

  it.each([
    ["all warm", { veins: "warm", daylight: "warm", metal: "warm", white: "warm" }, 1],
    ["all cool", { veins: "cool", daylight: "cool", metal: "cool", white: "cool" }, 1],
    [
      "all neutral",
      { veins: "neutral", daylight: "neutral", metal: "neutral", white: "neutral" },
      1,
    ],
    ["2 cool + 2 warm", { veins: "cool", daylight: "warm", metal: "cool", white: "warm" }, 0],
    ["3 warm + 1 cool", { veins: "warm", daylight: "warm", metal: "warm", white: "cool" }, 0.25],
    [
      "2 warm + 2 neutral",
      { veins: "warm", daylight: "neutral", metal: "warm", white: "neutral" },
      0.75,
    ],
  ] as const)("consistency: %s → %d", (_name, answers, consistency) => {
    expect(scoreQuiz(answers).consistency).toBeCloseTo(consistency, 12);
  });
});

describe("fuse", () => {
  const agree = (q: number, answeredCount = 4): QuizScore => ({ q, answeredCount, consistency: 1 });

  it("uses the photo alone when there are no quiz answers", () => {
    expect(fuse(0.4, 0.9, { q: null, answeredCount: 0, consistency: 1 })).toEqual({
      s: 0.4,
      photoWeight: 1,
      splitShrink: 1,
    });
  });

  it("weights the photo by PHOTO_WEIGHT_MAX × photo confidence", () => {
    const f = fuse(1, 1, agree(-1));
    expect(f.photoWeight).toBeCloseTo(PHOTO_WEIGHT_MAX, 12);
    expect(f.s).toBeCloseTo(PHOTO_WEIGHT_MAX * 1 + (1 - PHOTO_WEIGHT_MAX) * -1, 12);
    expect(f.splitShrink).toBe(1);
  });

  it("a low-quality photo gets less weight, so the quiz decides more", () => {
    const good = fuse(1, 0.9, agree(-1));
    const poor = fuse(1, 0.2, agree(-1));
    expect(poor.photoWeight).toBeLessThan(good.photoWeight);
    expect(poor.s).toBeLessThan(good.s);
    expect(poor.s).toBeLessThan(0); // the cool quiz now outweighs the warm photo
  });

  it("contradictory answers pull the result towards neutral", () => {
    const p = -0.6;
    const split = scoreQuiz({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" });
    const noQuiz = fuse(p, 0.8, { q: null, answeredCount: 0, consistency: 1 });
    const f = fuse(p, 0.8, split);
    expect(f.splitShrink).toBeCloseTo(1 - QUIZ_SPLIT_SHRINK, 12);
    expect(Math.abs(f.s)).toBeLessThan(Math.abs(noQuiz.s));
    // Without the shrink, w_p·p alone would remain; with it, half of that.
    expect(f.s).toBeCloseTo(PHOTO_WEIGHT_MAX * 0.8 * p * (1 - QUIZ_SPLIT_SHRINK), 12);
  });

  it("a cool photo with a split quiz (2 + 2) is no longer a plain 'cool' (synthetic case: hue 36°)", () => {
    const p = photoUndertoneScore(lch(60, 18, 36), UNCAL);
    const split = scoreQuiz({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" });
    expect(undertoneLabel(fuse(p, 0.7, split).s)).toBe("neutral");
  });

  it("clamps photo confidence to [0, 1]", () => {
    expect(fuse(1, 5, agree(0, 1)).photoWeight).toBe(PHOTO_WEIGHT_MAX);
    expect(fuse(1, -1, agree(0, 1)).photoWeight).toBe(0);
  });
});

describe("undertoneLabel: explicit cut-points (issue M)", () => {
  const c = UNDERTONE_CUTS;
  it.each([
    [-1, "cool"],
    [c.coolBelow - 1e-9, "cool"],
    [c.coolBelow, "neutral-cool"],
    [c.neutralCoolBelow - 1e-9, "neutral-cool"],
    [c.neutralCoolBelow, "neutral"],
    [0, "neutral"],
    [c.neutralWarmAbove, "neutral"],
    [c.neutralWarmAbove + 1e-9, "neutral-warm"],
    [c.warmAbove, "neutral-warm"],
    [c.warmAbove + 1e-9, "warm"],
    [1, "warm"],
  ])("s = %d → %s", (s, label) => {
    expect(undertoneLabel(s)).toBe(label);
  });

  it("the cut-points are ordered and symmetric", () => {
    expect(c.coolBelow).toBeLessThan(c.neutralCoolBelow);
    expect(c.neutralCoolBelow).toBeLessThan(c.neutralWarmAbove);
    expect(c.neutralWarmAbove).toBeLessThan(c.warmAbove);
    expect(c.coolBelow).toBe(-c.warmAbove);
    expect(c.neutralCoolBelow).toBe(-c.neutralWarmAbove);
  });
});
