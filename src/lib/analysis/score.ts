/**
 * Scoring entry point (M4): skin sample + quality result + quiz answers → depth, undertone and
 * confidence (SPEC §6.5–6.6). Pure; numbers only.
 *
 * Since M6b the photo is released right after analysis, so scoring runs from a `PhotoSummary`:
 * the overall skin colour and the photo evidence, a handful of numbers with no pixels, pixel
 * positions or landmarks. `scoreAnalysis` (sample + quality) is the same computation in one step.
 */
import type { Lab } from "@/lib/color";
import { depthFromLab, type Depth } from "./depth";
import {
  overallConfidence,
  photoConfidence,
  type ConfidenceNote,
  type PhotoConfidence,
  type PhotoEvidence,
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
 * What scoring needs from a photo, and all that is kept of it after analysis: the overall skin
 * colour (weighted median Lab) and the evidence for photo confidence.
 */
export type PhotoSummary = { skin: Lab; evidence: PhotoEvidence };

/**
 * Reduce a skin sample and its quality result to a `PhotoSummary`. Returns null when there's no
 * usable skin colour (no region had enough pixels). Quality warnings count as overridden:
 * scoring only happens when the user chose to continue ("analyse anyway").
 */
export function summarizePhoto(sample: SkinSample, quality: QualityResult): PhotoSummary | null {
  if (!sample.overall) return null;
  return {
    skin: { ...sample.overall },
    evidence: {
      overriddenIssues: quality.issues
        .filter((i) => i.severity === "warning")
        .map((i) => ({ ...i })),
      usedPixels: sample.usedRegions.reduce((s, n) => s + sample.regions[n].validPixels, 0),
      lowPixelRegionCount: sample.lowPixelRegions.length,
      cheekImbalance: sample.cheekImbalance !== null,
      cheekChromatic: sample.cheekDifference?.chromatic ?? null,
      unevenLighting: sample.unevenLighting,
      cheekRedness: sample.weightReasons.includes("cheekRedness"),
      calibrated: sample.calibrated,
    },
  };
}

/** Depth, undertone and confidence from a photo summary and the quiz answers. */
export function scorePhoto(summary: PhotoSummary, answers: QuizAnswers): ScoreResult {
  const { skin, evidence } = summary;
  const photo = photoConfidence(evidence);
  const p = photoUndertoneScore(skin, { calibrated: evidence.calibrated });
  const quiz = scoreQuiz(answers);
  const { s, photoWeight, splitShrink } = fuse(p, photo.value, quiz);
  const overall = overallConfidence(p, photo.value, quiz, { calibrated: evidence.calibrated });
  return {
    depth: depthFromLab(skin),
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
  const summary = summarizePhoto(sample, quality);
  return summary ? scorePhoto(summary, answers) : null;
}
