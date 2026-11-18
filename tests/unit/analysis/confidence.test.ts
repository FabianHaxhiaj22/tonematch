import { describe, expect, it } from "vitest";
import {
  AGREEMENT_MIN_FACTOR,
  OVERALL_MAX_UNCALIBRATED,
  OVERALL_PHOTO_SHARE,
  OVERALL_QUIZ_SHARE,
  PHOTO_CONFIDENCE_MIN,
  PHOTO_ISSUE_FACTORS,
  PHOTO_PIXELS_MIN_FACTOR,
  PHOTO_UNCALIBRATED_FACTOR,
} from "@/lib/analysis/config";
import { overallConfidence, photoConfidence, type PhotoEvidence } from "@/lib/analysis/confidence";
import type { QualityIssue } from "@/lib/analysis/quality";
import { fuse, scoreQuiz } from "@/lib/analysis/undertone";

const CAL = { calibrated: true };
const UNCAL = { calibrated: false };

const GOOD: PhotoEvidence = {
  overriddenIssues: [],
  usedPixels: 5000,
  lowPixelRegionCount: 0,
  cheekImbalance: false,
  cheekChromatic: 0,
  unevenLighting: false,
  cheekRedness: false,
  calibrated: true,
};
const warn = (code: QualityIssue["code"]): QualityIssue => ({ code, severity: "warning" });

describe("photoConfidence (before fusion, photo evidence only)", () => {
  it("is 1 for a clean, calibrated photo with plenty of pixels", () => {
    expect(photoConfidence(GOOD)).toEqual({ value: 1, factors: [] });
  });

  it("is lower without calibration", () => {
    expect(photoConfidence({ ...GOOD, calibrated: false }).value).toBe(PHOTO_UNCALIBRATED_FACTOR);
  });

  it("multiplies one factor per overridden quality warning", () => {
    const r = photoConfidence({ ...GOOD, overriddenIssues: [warn("TOO_DARK"), warn("BLURRY")] });
    expect(r.value).toBeCloseTo(PHOTO_ISSUE_FACTORS.TOO_DARK * PHOTO_ISSUE_FACTORS.BLURRY, 12);
    expect(r.factors.map((f) => f.reason)).toEqual(["TOO_DARK", "BLURRY"]);
  });

  it("a corrected colour cast (calibrated) costs less than an uncorrected one", () => {
    const cast = [warn("COLOR_CAST")];
    const calibrated = photoConfidence({ ...GOOD, overriddenIssues: cast }).value;
    const uncorrected = photoConfidence({
      ...GOOD,
      overriddenIssues: cast,
      calibrated: false,
    }).value;
    expect(uncorrected).toBeLessThan(calibrated);
  });

  it("ignores blocking issues and codes without a factor", () => {
    const r = photoConfidence({
      ...GOOD,
      overriddenIssues: [{ code: "NO_FACE", severity: "blocking" }, warn("MULTIPLE_FACES")],
    });
    expect(r.value).toBe(1);
  });

  it("drops with fewer pixels, down to the minimum factor", () => {
    expect(photoConfidence({ ...GOOD, usedPixels: 2000 }).value).toBe(1);
    expect(photoConfidence({ ...GOOD, usedPixels: 300 }).value).toBeCloseTo(
      PHOTO_PIXELS_MIN_FACTOR,
      12,
    );
    const mid = photoConfidence({ ...GOOD, usedPixels: 1150 }).value;
    expect(mid).toBeGreaterThan(PHOTO_PIXELS_MIN_FACTOR);
    expect(mid).toBeLessThan(1);
  });

  it("uses cheek colour disagreement (the M3 real selfie: ΔE 3.5, mostly b*)", () => {
    const r = photoConfidence({ ...GOOD, cheekChromatic: 3.5 });
    expect(r.value).toBeCloseTo(0.825, 3);
    expect(r.factors[0]!.reason).toBe("cheekDisagreement");
    expect(photoConfidence({ ...GOOD, cheekChromatic: 20 }).value).toBeCloseTo(0.6, 12);
  });

  it("is lowered by cheek imbalance, uneven light, cheek redness and low-pixel regions", () => {
    for (const patch of [
      { cheekImbalance: true },
      { unevenLighting: true },
      { cheekRedness: true },
      { lowPixelRegionCount: 1 },
    ]) {
      expect(photoConfidence({ ...GOOD, ...patch }).value).toBeLessThan(1);
    }
  });

  it("never goes below the minimum", () => {
    const awful = photoConfidence({
      overriddenIssues: Object.keys(PHOTO_ISSUE_FACTORS).map((c) =>
        warn(c as QualityIssue["code"]),
      ),
      usedPixels: 0,
      lowPixelRegionCount: 3,
      cheekImbalance: true,
      cheekChromatic: 30,
      unevenLighting: true,
      cheekRedness: true,
      calibrated: false,
    });
    expect(awful.value).toBe(PHOTO_CONFIDENCE_MIN);
  });

  it("a low-quality photo lowers the photo's weight in fusion", () => {
    const quiz = { q: -1, answeredCount: 4, consistency: 1 };
    const clean = photoConfidence(GOOD).value;
    const poor = photoConfidence({
      ...GOOD,
      overriddenIssues: [warn("TOO_DARK"), warn("HEAD_TILTED")],
      cheekChromatic: 5,
    }).value;
    expect(fuse(1, poor, quiz).photoWeight).toBeLessThan(fuse(1, clean, quiz).photoWeight);
  });
});

describe("overallConfidence (after fusion)", () => {
  it("combines photo confidence and quiz completeness", () => {
    const r = overallConfidence(0.5, 1, { q: 0.5, answeredCount: 4, consistency: 1 }, CAL);
    expect(r.value).toBeCloseTo(OVERALL_PHOTO_SHARE + OVERALL_QUIZ_SHARE, 12);
    expect(r.notes).toEqual([]);
  });

  it("without quiz answers it tops out at the photo share and says so", () => {
    const r = overallConfidence(0.5, 1, { q: null, answeredCount: 0, consistency: 1 }, CAL);
    expect(r.value).toBeCloseTo(OVERALL_PHOTO_SHARE, 12);
    expect(r.notes).toEqual(["noQuizAnswers"]);
  });

  it("photo and quiz disagreeing lowers confidence and adds a note", () => {
    const agree = overallConfidence(0.8, 0.9, { q: 1, answeredCount: 4, consistency: 1 }, CAL);
    const disagree = overallConfidence(0.8, 0.9, { q: -1, answeredCount: 4, consistency: 1 }, CAL);
    expect(disagree.value).toBeLessThan(agree.value);
    expect(disagree.notes).toContain("photoQuizDisagree");
    expect(agree.notes).not.toContain("photoQuizDisagree");
  });

  it("does not note disagreement from a single answer", () => {
    const r = overallConfidence(1, 0.9, { q: -1, answeredCount: 1, consistency: 1 }, CAL);
    expect(r.notes).not.toContain("photoQuizDisagree");
  });

  it("small differences cost nothing", () => {
    const a = overallConfidence(0.3, 0.8, { q: 0.3, answeredCount: 3, consistency: 1 }, CAL).value;
    const b = overallConfidence(0.3, 0.8, { q: 0.7, answeredCount: 3, consistency: 1 }, CAL).value;
    expect(b).toBeCloseTo(a, 12);
  });

  it("notes a low photo confidence", () => {
    expect(
      overallConfidence(0, 0.2, { q: 0, answeredCount: 4, consistency: 1 }, CAL).notes,
    ).toContain("lowPhotoConfidence");
  });

  it("does not depend on the quiz for photo confidence (separate steps)", () => {
    // photoConfidence has no quiz input at all; this documents it at the type level.
    const keys = Object.keys(GOOD);
    expect(keys.some((k) => /quiz|answer/i.test(k))).toBe(false);
  });
});

describe("quiz consistency in overall confidence (D-029)", () => {
  const p = -0.3;
  const photo = 0.7;
  const none = overallConfidence(p, photo, scoreQuiz({}), CAL);
  const conf = (answers: Parameters<typeof scoreQuiz>[0]) =>
    overallConfidence(p, photo, scoreQuiz(answers), CAL).value;

  it("all-agreeing answers raise confidence above the photo alone", () => {
    expect(conf({ veins: "cool", daylight: "cool", metal: "cool", white: "cool" })).toBeGreaterThan(
      none.value,
    );
    expect(
      conf({ veins: "neutral", daylight: "neutral", metal: "neutral", white: "neutral" }),
    ).toBeGreaterThan(none.value);
  });

  it("split answers (2 cool + 2 warm) lower confidence below the photo alone", () => {
    expect(conf({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" })).toBeLessThan(
      none.value,
    );
  });

  it("more agreement means more confidence: 4/0 > 3/1 > 2/2", () => {
    const allCool = conf({ veins: "cool", daylight: "cool", metal: "cool", white: "cool" });
    const threeOne = conf({ veins: "cool", daylight: "cool", metal: "cool", white: "warm" });
    const split = conf({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" });
    expect(allCool).toBeGreaterThan(threeOne);
    expect(threeOne).toBeGreaterThan(split);
  });

  it("the real-testing case: a split quiz no longer raises confidence (was 64% → 68%)", () => {
    const split = conf({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" });
    expect(split).toBeLessThan(none.value);
  });
});

describe("overall confidence cap without calibration (D-029)", () => {
  const allAgree = scoreQuiz({ veins: "cool", daylight: "cool", metal: "cool", white: "cool" });

  it("an uncalibrated photo never goes above the cap, however good", () => {
    const r = overallConfidence(-1, 1, allAgree, UNCAL);
    expect(r.value).toBe(OVERALL_MAX_UNCALIBRATED);
    for (const photo of [0.5, 0.8, 0.95, 1]) {
      for (const p of [-1, -0.5, 0, 0.5]) {
        expect(overallConfidence(p, photo, allAgree, UNCAL).value).toBeLessThanOrEqual(
          OVERALL_MAX_UNCALIBRATED,
        );
      }
    }
  });

  it("white-paper calibration can go higher", () => {
    expect(overallConfidence(-1, 1, allAgree, CAL).value).toBeGreaterThan(OVERALL_MAX_UNCALIBRATED);
  });

  it("below the cap, calibration doesn't change the value", () => {
    const split = scoreQuiz({ veins: "cool", daylight: "warm", metal: "cool", white: "warm" });
    expect(overallConfidence(-0.3, 0.7, split, UNCAL).value).toBeCloseTo(
      overallConfidence(-0.3, 0.7, split, CAL).value,
      12,
    );
  });
});

describe("photo and quiz in opposite directions (D-029)", () => {
  it("the tested case (photo p ≈ −0.43, all warm answers) lands around 55–60%", () => {
    const allWarm = scoreQuiz({ veins: "warm", daylight: "warm", metal: "warm", white: "warm" });
    const r = overallConfidence(-0.43, 0.89, allWarm, UNCAL);
    expect(r.value).toBeGreaterThanOrEqual(0.55);
    expect(r.value).toBeLessThanOrEqual(0.6);
    expect(r.notes).toContain("photoQuizDisagree");
  });

  it("full disagreement (|p − q| = 2) costs the minimum agreement factor", () => {
    const allWarm = scoreQuiz({ veins: "warm", daylight: "warm", metal: "warm", white: "warm" });
    const r = overallConfidence(-1, 1, allWarm, CAL);
    expect(r.value).toBeCloseTo((OVERALL_PHOTO_SHARE + 0.4) * AGREEMENT_MIN_FACTOR, 12);
  });
});
