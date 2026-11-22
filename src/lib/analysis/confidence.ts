/**
 * Confidence (SPEC §6.6, issue L), in two separate steps:
 * - photoConfidence: before fusion, from photo evidence only (never the quiz);
 * - overallConfidence: after fusion, from photo confidence, quiz answers and their agreement.
 * Both are 0–1 (displayed as a percentage). All factors are heuristics in config.ts.
 */
import {
  AGREEMENT_FULL_DIFF,
  AGREEMENT_MIN_FACTOR,
  DISAGREEMENT_NOTE_DIFF,
  DISAGREEMENT_NOTE_MIN_ANSWERS,
  LOW_PHOTO_CONFIDENCE_NOTE,
  OVERALL_MAX_UNCALIBRATED,
  OVERALL_PHOTO_SHARE,
  OVERALL_QUIZ_SHARE,
  PHOTO_CHEEK_CHROMATIC_FULL,
  PHOTO_CHEEK_CHROMATIC_MIN_FACTOR,
  PHOTO_CHEEK_IMBALANCE_FACTOR,
  PHOTO_CHEEK_REDNESS_FACTOR,
  PHOTO_COLOR_CAST_CALIBRATED_FACTOR,
  PHOTO_CONFIDENCE_MIN,
  PHOTO_ISSUE_FACTORS,
  PHOTO_LOW_PIXEL_REGION_FACTOR,
  PHOTO_PIXELS_GOOD,
  PHOTO_PIXELS_MIN,
  PHOTO_PIXELS_MIN_FACTOR,
  PHOTO_UNCALIBRATED_FACTOR,
  PHOTO_UNEVEN_LIGHTING_FACTOR,
  QUIZ_SPLIT_PENALTY,
} from "./config";
import type { QualityIssue } from "./quality";
import type { QuizScore } from "./undertone";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Photo evidence that feeds photo confidence. Deliberately has no quiz fields. */
export type PhotoEvidence = {
  /** Quality warnings the user chose to analyse anyway (blocking issues never get here). */
  overriddenIssues: readonly QualityIssue[];
  /** Valid pixels in the regions that made the overall colour. */
  usedPixels: number;
  lowPixelRegionCount: number;
  cheekImbalance: boolean;
  /** Colour part of the cheek difference; null if not comparable. */
  cheekChromatic: number | null;
  unevenLighting: boolean;
  /** Cheeks looked redder than the forehead (blush, bronzer or flushing). */
  cheekRedness: boolean;
  calibrated: boolean;
};

export type ConfidenceFactor = { reason: string; factor: number };
export type PhotoConfidence = { value: number; factors: ConfidenceFactor[] };

/** Linear interpolation of a factor between (x0 → 1) and (x1 → minFactor), clamped. */
function ramp(x: number, x0: number, x1: number, minFactor: number): number {
  const t = clamp((x - x0) / (x1 - x0), 0, 1);
  return 1 - t * (1 - minFactor);
}

export function photoConfidence(e: PhotoEvidence): PhotoConfidence {
  const factors: ConfidenceFactor[] = [];
  const add = (reason: string, factor: number) => {
    if (factor < 1) factors.push({ reason, factor });
  };
  for (const issue of e.overriddenIssues) {
    if (issue.severity !== "warning") continue;
    const code = issue.code as keyof typeof PHOTO_ISSUE_FACTORS;
    if (!(code in PHOTO_ISSUE_FACTORS)) continue;
    add(
      code,
      code === "COLOR_CAST" && e.calibrated
        ? PHOTO_COLOR_CAST_CALIBRATED_FACTOR
        : PHOTO_ISSUE_FACTORS[code],
    );
  }
  if (!e.calibrated) add("uncalibrated", PHOTO_UNCALIBRATED_FACTOR);
  // Fewer pixels → less trust: 1 at ≥ GOOD, MIN_FACTOR at ≤ MIN.
  add(
    "fewPixels",
    ramp(e.usedPixels, PHOTO_PIXELS_GOOD, PHOTO_PIXELS_MIN, PHOTO_PIXELS_MIN_FACTOR),
  );
  for (let i = 0; i < e.lowPixelRegionCount; i++)
    add("lowPixelRegion", PHOTO_LOW_PIXEL_REGION_FACTOR);
  if (e.cheekImbalance) add("cheekImbalance", PHOTO_CHEEK_IMBALANCE_FACTOR);
  if (e.cheekChromatic !== null) {
    add(
      "cheekDisagreement",
      ramp(e.cheekChromatic, 0, PHOTO_CHEEK_CHROMATIC_FULL, PHOTO_CHEEK_CHROMATIC_MIN_FACTOR),
    );
  }
  if (e.unevenLighting) add("unevenLighting", PHOTO_UNEVEN_LIGHTING_FACTOR);
  if (e.cheekRedness) add("cheekRedness", PHOTO_CHEEK_REDNESS_FACTOR);
  const value = factors.reduce((v, f) => v * f.factor, 1);
  return { value: clamp(value, PHOTO_CONFIDENCE_MIN, 1), factors };
}

/** Note keys for the UI (src/i18n messages). Never mentions makeup. */
export type ConfidenceNote = "photoQuizDisagree" | "lowPhotoConfidence" | "noQuizAnswers";

export type OverallConfidence = { value: number; notes: ConfidenceNote[] };

/**
 * After fusion: (PHOTO_SHARE × photo + QUIZ_SHARE × answered/4 × consistency) × agreement ×
 * split factor. The agreement factor falls as |p − q| grows beyond AGREEMENT_FULL_DIFF; the
 * split factor 1 − QUIZ_SPLIT_PENALTY × (1 − consistency) makes contradictory answers lower
 * confidence below what the photo alone gives (D-029). Capped at OVERALL_MAX_UNCALIBRATED
 * without white-paper calibration.
 */
export function overallConfidence(
  p: number,
  photo: number,
  quiz: QuizScore,
  opts: { calibrated: boolean },
): OverallConfidence {
  const notes: ConfidenceNote[] = [];
  const base =
    OVERALL_PHOTO_SHARE * clamp(photo, 0, 1) +
    OVERALL_QUIZ_SHARE * (quiz.answeredCount / 4) * quiz.consistency;
  let agreement = 1;
  if (quiz.q === null) {
    notes.push("noQuizAnswers");
  } else {
    const diff = Math.abs(p - quiz.q);
    agreement = ramp(diff, AGREEMENT_FULL_DIFF, 2, AGREEMENT_MIN_FACTOR);
    if (diff > DISAGREEMENT_NOTE_DIFF && quiz.answeredCount >= DISAGREEMENT_NOTE_MIN_ANSWERS) {
      notes.push("photoQuizDisagree");
    }
  }
  if (photo < LOW_PHOTO_CONFIDENCE_NOTE) notes.push("lowPhotoConfidence");
  const split = 1 - QUIZ_SPLIT_PENALTY * (1 - quiz.consistency);
  // Without white-paper calibration the result can't be more than OVERALL_MAX_UNCALIBRATED sure.
  const max = opts.calibrated ? 1 : OVERALL_MAX_UNCALIBRATED;
  return { value: clamp(base * agreement * split, 0, max), notes };
}
