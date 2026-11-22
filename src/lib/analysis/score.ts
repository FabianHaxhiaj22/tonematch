/**
 * Scoring entry point (M4): skin sample + quality result + quiz answers → depth, undertone and
 * confidence (SPEC §6.5–6.6). Pure; numbers only.
 */
import { depthFromLab, type Depth } from "./depth";
import {
  overallConfidence,
  photoConfidence,
  type ConfidenceNote,
  type PhotoConfidence,
} from "./confidence";
import type { QualityResult } from "./quality";
import type { SkinSample } from "./sampler";
import {
  fuse,
  photoUndertoneScore,
  scoreQuiz,
  undertoneLabel,
  type QuizAnswers,
  type UndertoneLabel,
} from "./undertone";

export type ScoreResult = {
  depth: Depth;
  undertone: {
    label: UndertoneLabel;
    /** Fused score s ∈ [−1, 1]. */
    score: number;
    /** Photo score p from hue. */
    photoScore: number;
    /** Quiz score q, or null when no question was answered. */
    quizScore: number | null;
    answeredCount: number;
    /** Weight the photo got in fusion (1 when there were no answers). */
    photoWeight: number;
    /** 1 − variance of the quiz answers (1 = all agree, 0 = even cool/warm split). */
    quizConsistency: number;
    /** Factor pulling s towards neutral for contradictory answers (1 = none). */
    splitShrink: number;
  };
  photoConfidence: PhotoConfidence;
  /** After fusion, 0–1 (shown as a percentage). */
  confidence: number;
  notes: ConfidenceNote[];
};

/**
 * Returns null when there's no usable skin colour (no face, or no region had enough pixels).
 * `quality.issues` that are warnings count as overridden: analysis only reaches this point when
 * the user chose to continue.
 */
export function scoreAnalysis(
  sample: SkinSample,
  quality: QualityResult,
  answers: QuizAnswers,
): ScoreResult | null {
  if (!sample.overall) return null;
  const usedPixels = sample.usedRegions.reduce((s, n) => s + sample.regions[n].validPixels, 0);
  const photo = photoConfidence({
    overriddenIssues: quality.issues.filter((i) => i.severity === "warning"),
    usedPixels,
    lowPixelRegionCount: sample.lowPixelRegions.length,
    cheekImbalance: sample.cheekImbalance !== null,
    cheekChromatic: sample.cheekDifference?.chromatic ?? null,
    unevenLighting: sample.unevenLighting,
    cheekRedness: sample.weightReasons.includes("cheekRedness"),
    calibrated: sample.calibrated,
  });
  const p = photoUndertoneScore(sample.overall, { calibrated: sample.calibrated });
  const quiz = scoreQuiz(answers);
  const { s, photoWeight, splitShrink } = fuse(p, photo.value, quiz);
  const overall = overallConfidence(p, photo.value, quiz, { calibrated: sample.calibrated });
  return {
    depth: depthFromLab(sample.overall),
    undertone: {
      label: undertoneLabel(s),
      score: s,
      photoScore: p,
      quizScore: quiz.q,
      answeredCount: quiz.answeredCount,
      photoWeight,
      quizConsistency: quiz.consistency,
      splitShrink,
    },
    photoConfidence: photo,
    confidence: overall.value,
    notes: overall.notes,
  };
}
