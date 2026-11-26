/**
 * Undertone (SPEC §6.6): photo score from hue angle, the 4-question quiz, fusion and the
 * five buckets. Pure. Nothing here takes depth as an input, so depth can't bias the undertone.
 */
import { hueAngle, type Lab } from "@/lib/color";
import {
  HUE_NEUTRAL_CENTRE_DEG,
  HUE_SCALE_DEG,
  PHOTO_SCORE_CAP_CALIBRATED,
  PHOTO_SCORE_CAP_UNCALIBRATED,
  PHOTO_WEIGHT_MAX,
  QUIZ_ANSWER_SCORES,
  QUIZ_SPLIT_SHRINK,
  UNDERTONE_CUTS,
} from "./config";
import { hueDelta } from "./stats";

export type UndertoneLabel = "cool" | "neutral-cool" | "neutral" | "neutral-warm" | "warm";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Photo score p (−cap cool … +cap warm) from the hue angle only (D-029):
 * p = cap × tanh(Δh / HUE_SCALE_DEG), where Δh is the signed, wrapped hue difference from the
 * neutral centre (a pinkish hue just below 0°, e.g. 350°, reads as cool, not warm). The cap is
 * lower without white-paper calibration, since camera white balance shifts hue.
 */
export function photoUndertoneScore(lab: Lab, opts: { calibrated: boolean }): number {
  const diff = hueDelta(hueAngle(lab), HUE_NEUTRAL_CENTRE_DEG);
  const cap = opts.calibrated ? PHOTO_SCORE_CAP_CALIBRATED : PHOTO_SCORE_CAP_UNCALIBRATED;
  return cap * Math.tanh(diff / HUE_SCALE_DEG);
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────────────────

/** Question ids in display order (SPEC §6.6; Q2 per DECISIONS D-009). */
export const QUIZ_QUESTIONS = ["veins", "daylight", "metal", "white"] as const;
export type QuizQuestion = (typeof QUIZ_QUESTIONS)[number];
/** Every question has these four answers; "unsure" = "not sure / doesn't apply" (skipped). */
export const QUIZ_ANSWERS = ["cool", "warm", "neutral", "unsure"] as const;
export type QuizAnswer = (typeof QUIZ_ANSWERS)[number];
export type QuizAnswers = Partial<Record<QuizQuestion, QuizAnswer>>;

export type QuizScore = {
  /** Mean of the answered questions, or null when none were answered. */
  q: number | null;
  /** Questions answered with something other than "unsure" (0–4). */
  answeredCount: number;
  /**
   * 1 − variance of the answered values: 1 when they all agree (all neutral counts as agreeing),
   * 0 for an even cool/warm split. 1 when fewer than two questions were answered.
   */
  consistency: number;
};

export function scoreQuiz(answers: QuizAnswers): QuizScore {
  const values = QUIZ_QUESTIONS.map((id) => answers[id])
    .filter((a): a is Exclude<QuizAnswer, "unsure"> => a !== undefined && a !== "unsure")
    .map((a): number => QUIZ_ANSWER_SCORES[a]);
  if (values.length === 0) return { q: null, answeredCount: 0, consistency: 1 };
  const q = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - q) ** 2, 0) / values.length;
  return { q, answeredCount: values.length, consistency: clamp(1 - variance, 0, 1) };
}

// ─── Fusion and buckets ───────────────────────────────────────────────────────────────────

export type Fusion = {
  /** Fused score s ∈ [−1, 1]. */
  s: number;
  /** Photo weight w_p = PHOTO_WEIGHT_MAX × photoConfidence (1 when there are no answers). */
  photoWeight: number;
  /** Factor ≤ 1 pulling s towards neutral when the quiz answers contradict each other. */
  splitShrink: number;
};

/**
 * s = (w_p·p + (1 − w_p)·q) × splitShrink; with no answered questions, s = p (SPEC §6.6).
 * splitShrink = 1 − QUIZ_SPLIT_SHRINK × (1 − consistency): contradictory answers (e.g. 2 cool +
 * 2 warm) signal uncertainty, so the result moves towards neutral (D-029).
 */
export function fuse(p: number, photoConfidence: number, quiz: QuizScore): Fusion {
  if (quiz.q === null) return { s: p, photoWeight: 1, splitShrink: 1 };
  const wp = PHOTO_WEIGHT_MAX * clamp(photoConfidence, 0, 1);
  const splitShrink = 1 - QUIZ_SPLIT_SHRINK * (1 - quiz.consistency);
  return { s: (wp * p + (1 - wp) * quiz.q) * splitShrink, photoWeight: wp, splitShrink };
}

/** Five buckets with the explicit cut-points from config (SPEC §6.6 table). */
export function undertoneLabel(s: number): UndertoneLabel {
  const c = UNDERTONE_CUTS;
  if (s < c.coolBelow) return "cool";
  if (s < c.neutralCoolBelow) return "neutral-cool";
  if (s <= c.neutralWarmAbove) return "neutral";
  if (s <= c.warmAbove) return "neutral-warm";
  return "warm";
}
