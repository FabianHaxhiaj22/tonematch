/**
 * Results view model (M6b-2): turns what the flow keeps (the photo summary from /analyze and the
 * quiz answers) into everything the results page shows, as plain data. Pure: no React, no
 * strings. Text is referenced by message key; colours are `#rrggbb`.
 *
 * It runs M4's scoring (`scorePhoto`) and M5's engine (`recommend`) and adds what only the page
 * needs: the skin colour for display (`labToSrgb`), metal/gemstone swatches and names from the
 * data, tiers grouped in order, and which note becomes the prominent "both can work" message.
 */
import { DEPTH_SCALE, type DepthLabel } from "@/lib/analysis/config";
import type { PhotoSummary } from "@/lib/analysis/score";
import { scorePhoto } from "@/lib/analysis/score";
import type { QuizAnswers, UndertoneLabel } from "@/lib/analysis/undertone";
import { labToSrgb, rgbToHex } from "@/lib/color";
import {
  direction,
  fromScoreResult,
  recommend,
  type RecommendationNote,
} from "@/lib/recommend/engine";
import {
  CATEGORIES,
  TIERS,
  type Category,
  type RecommendData,
  type Tier,
} from "@/lib/recommend/schema";

export type MetalView = {
  id: string;
  nameKey: string;
  /** One colour, or 2–3 stops for a blended swatch (mixed metals), from metals.json. */
  swatch: readonly string[];
  reasonKey: string;
};

export type ResultsView = {
  /**
   * Below the engine's confidence threshold: no metal family is ranked first, the page leads
   * with "Both can work", and the undertone label is shown only as a smaller "reading".
   */
  uncertain: boolean;
  /** The undertone reading (M4's label, also when uncertain). */
  undertone: UndertoneLabel;
  depth: DepthLabel;
  /** Approximate Monk Skin Tone index 1–10 (always labelled approximate in the UI). */
  mstApprox: number;
  /** Overall confidence as a whole percentage, 0–100. */
  confidencePercent: number;
  /** The sampled skin colour for display. Approximate: screens and cameras differ. */
  skinHex: string;
  /**
   * Number of steps on the MST scale (10), for the position track. The track shows a position,
   * not colours: the official swatches are display colours, much lighter than skin measured in a
   * photo, so next to the sampled swatch they looked like a wrong match (D-039).
   */
  mstSteps: number;
  /**
   * The one-line summary, or null when uncertain: then the heading ("Both can work") and the
   * lead note already say it, and a third time would only repeat it (D-039).
   */
  summaryKey: string | null;
  finishKey: string;
  /** Tiers in order (best → good → care), empty tiers left out. */
  metalTiers: { tier: Tier; metals: MetalView[] }[];
  styles: { category: Category; items: { id: string; labelKey: string }[] }[];
  gemstones: { id: string; nameKey: string; swatch: string }[];
  /** Which way the gemstones lean (sets the section's eyebrow). */
  palette: "warm" | "cool" | "balanced";
  /** The note shown prominently near the top ("both can work"), or null. */
  leadNote: RecommendationNote | null;
  /** The other notes ("Good to know"), in the engine's order. */
  notes: RecommendationNote[];
};

/** The engine's low-confidence note: shown prominently, not among the other notes. */
const UNCERTAIN_NOTE: RecommendationNote = "bothCanWorkUncertain";

/** Whole percentage for display (0.744 → 74). */
export function toPercent(confidence: number): number {
  return Math.round(Math.min(1, Math.max(0, confidence)) * 100);
}

export function buildResultsView(
  summary: PhotoSummary,
  answers: QuizAnswers,
  data: RecommendData,
): ResultsView {
  const score = scorePhoto(summary, answers);
  const rec = recommend(fromScoreResult(score), data);
  const uncertain = rec.notes.includes(UNCERTAIN_NOTE);

  const metalsById = new Map(data.metals.map((m) => [m.id, m]));
  const metalTiers = TIERS.map((tier) => ({
    tier,
    metals: rec.metals
      .filter((m) => m.tier === tier)
      .map((m) => {
        const metal = metalsById.get(m.id)!;
        return { id: m.id, nameKey: metal.nameKey, swatch: metal.swatch, reasonKey: m.reasonKey };
      }),
  })).filter((t) => t.metals.length > 0);

  const gemsById = new Map(data.gemstones.map((g) => [g.id, g]));
  const gemstones = rec.gemstones.map((id) => {
    const g = gemsById.get(id)!;
    return { id, nameKey: g.nameKey, swatch: g.swatch };
  });

  const lean = uncertain ? null : direction(rec.undertone);

  return {
    uncertain,
    undertone: rec.undertone,
    depth: rec.depth,
    mstApprox: rec.mstApprox,
    confidencePercent: toPercent(rec.confidence),
    skinHex: rgbToHex(labToSrgb(summary.skin)),
    mstSteps: DEPTH_SCALE.length,
    summaryKey: uncertain ? null : rec.summaryKey,
    finishKey: rec.finishKey,
    metalTiers,
    styles: CATEGORIES.map((category) => ({
      category,
      items: rec.styles[category].map(({ id, labelKey }) => ({ id, labelKey })),
    })),
    gemstones,
    palette: lean ?? "balanced",
    leadNote: uncertain ? UNCERTAIN_NOTE : null,
    notes: rec.notes.filter((n) => n !== UNCERTAIN_NOTE),
  };
}
