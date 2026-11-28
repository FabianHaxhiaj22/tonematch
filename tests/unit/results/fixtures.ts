/** Photo summaries and quiz answers that give known results (numbers only, no images). */
import type { PhotoEvidence } from "@/lib/analysis/confidence";
import type { PhotoSummary } from "@/lib/analysis/score";
import type { QuizAnswer, QuizAnswers } from "@/lib/analysis/undertone";

export const EVIDENCE: PhotoEvidence = {
  overriddenIssues: [],
  usedPixels: 5000,
  lowPixelRegionCount: 0,
  cheekImbalance: false,
  cheekChromatic: 1,
  unevenLighting: false,
  cheekRedness: false,
  calibrated: false,
};

/** Hue ≈ 67°: reads warm. */
export const WARM_SKIN: PhotoSummary = { skin: { L: 62, a: 10, b: 24 }, evidence: EVIDENCE };
/** Hue ≈ 37°: reads cool. */
export const COOL_SKIN: PhotoSummary = { skin: { L: 62, a: 16, b: 12 }, evidence: EVIDENCE };
/** Hue ≈ 56°: about neutral. */
export const NEUTRAL_SKIN: PhotoSummary = { skin: { L: 62, a: 13, b: 19 }, evidence: EVIDENCE };

export const all = (a: QuizAnswer): QuizAnswers => ({ veins: a, daylight: a, metal: a, white: a });
/** Two warm, two cool: consistency 0, so confidence drops below the engine's threshold. */
export const SPLIT: QuizAnswers = { veins: "warm", daylight: "cool", metal: "warm", white: "cool" };
