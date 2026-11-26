/**
 * Recommendation engine (SPEC §7, D-030): M4's result → metal tiers, styles, gemstones and
 * explanation keys. Pure and deterministic; the data is passed in (data.ts loads the real files).
 *
 * Rules, in order:
 * 1. **Low confidence** (< LOW_CONFIDENCE_THRESHOLD): recommend as if the undertone were neutral
 *    ("balanced"), so no metal family is ranked over the other; note `bothCanWorkUncertain`.
 *    The output still reports M4's undertone label as it was.
 * 2. Each item's score blends its affinity columns for the (effective) undertone; metal tiers
 *    come from TIER_BEST_MIN / TIER_GOOD_MIN.
 * 3. Guard rules, which the data can't override:
 *    - the favoured family (warm or cool) always has a "best" metal; when balanced, both do;
 *    - in neutral-warm / neutral-cool, every metal of the other family is at least "good".
 * 4. **Depth** only picks finish/contrast advice and depth-filtered style items. It never
 *    changes metal tiers or gemstones (tested for every undertone × depth).
 */
import type { ConfidenceNote } from "@/lib/analysis/confidence";
import type { DepthLabel } from "@/lib/analysis/config";
import { labelForMst } from "@/lib/analysis/depth";
import type { ScoreResult } from "@/lib/analysis/score";
import type { UndertoneLabel } from "@/lib/analysis/undertone";
import {
  GEMSTONE_MIN_SCORE,
  GEMSTONES_MAX,
  LEAN_WEIGHT,
  LOW_CONFIDENCE_THRESHOLD,
  STYLES_PER_CATEGORY,
  TIER_BEST_MIN,
  TIER_GOOD_MIN,
} from "./config";
import {
  CATEGORIES,
  type Affinity,
  type Category,
  type Metal,
  type RecommendData,
  type Relation,
  type StyleItem,
  type StyleTag,
  type Tier,
} from "./schema";

/** What the engine needs from M4 (SPEC §7, D-030). */
export type RecommendInput = {
  undertone: UndertoneLabel;
  depth: DepthLabel;
  /** Approximate MST index 1–10; must belong to `depth` (DEPTH_SCALE). */
  mstApprox: number;
  /** Overall confidence after fusion, 0–1. */
  confidence: number;
  notes: readonly ConfidenceNote[];
};

/** M4's notes plus the engine's own; each has a message at `notes.<code>`. */
export type RecommendationNote = ConfidenceNote | "bothCanWork" | "bothCanWorkUncertain";
export const ENGINE_NOTES = ["bothCanWork", "bothCanWorkUncertain"] as const;

export type MetalRecommendation = { id: string; tier: Tier; reasonKey: string };
export type StyleSuggestion = { id: string; tags: StyleTag[]; labelKey: string };

/** SPEC §7.3, plus the explanation keys (summaryKey, finishKey) added in M5 (D-030). */
export type Recommendation = {
  undertone: UndertoneLabel;
  depth: DepthLabel;
  mstApprox: number;
  confidence: number;
  /** One-line explanation of the outcome (message key). */
  summaryKey: string;
  /** Finish/contrast advice for the depth (message key). */
  finishKey: string;
  metals: MetalRecommendation[];
  styles: Record<Category, StyleSuggestion[]>;
  /** Gemstone ids; names at each gemstone's nameKey. */
  gemstones: string[];
  notes: RecommendationNote[];
};

/** Build the engine input from M4's ScoreResult. */
export function fromScoreResult(r: ScoreResult): RecommendInput {
  return {
    undertone: r.undertone.label,
    depth: r.depth.label,
    mstApprox: r.depth.mstApprox,
    confidence: r.confidence,
    notes: r.notes,
  };
}

// ─── Scoring helpers ──────────────────────────────────────────────────────────────────────

/** Weights of the affinity columns for each undertone bucket. */
export function columnWeights(undertone: UndertoneLabel): Affinity {
  switch (undertone) {
    case "cool":
      return { cool: 1, neutral: 0, warm: 0 };
    case "neutral-cool":
      return { cool: LEAN_WEIGHT, neutral: 1 - LEAN_WEIGHT, warm: 0 };
    case "neutral":
      return { cool: 0, neutral: 1, warm: 0 };
    case "neutral-warm":
      return { cool: 0, neutral: 1 - LEAN_WEIGHT, warm: LEAN_WEIGHT };
    case "warm":
      return { cool: 0, neutral: 0, warm: 1 };
  }
}

export function blendedScore(affinity: Affinity, undertone: UndertoneLabel): number {
  const w = columnWeights(undertone);
  return w.cool * affinity.cool + w.neutral * affinity.neutral + w.warm * affinity.warm;
}

export function tierFor(score: number): Tier {
  if (score >= TIER_BEST_MIN) return "best";
  if (score >= TIER_GOOD_MIN) return "good";
  return "care";
}

/** The metal family an undertone leans to, or null for neutral. */
export function direction(undertone: UndertoneLabel): "warm" | "cool" | null {
  if (undertone === "warm" || undertone === "neutral-warm") return "warm";
  if (undertone === "cool" || undertone === "neutral-cool") return "cool";
  return null;
}

const isLean = (u: UndertoneLabel) => u === "neutral-warm" || u === "neutral-cool";
const TIER_RANK: Record<Tier, number> = { best: 0, good: 1, care: 2 };

function relationOf(metal: Metal, dir: "warm" | "cool" | null): Relation {
  if (metal.family === "mixed") return "mixed";
  if (dir === null) return "balanced";
  return metal.family === dir ? "favoured" : "other";
}

// ─── Metals ───────────────────────────────────────────────────────────────────────────────

export function rankMetals(
  metals: readonly Metal[],
  effective: UndertoneLabel,
  reasons: RecommendData["explanations"]["metalReasons"],
): MetalRecommendation[] {
  const dir = direction(effective);
  const scored = metals.map((m) => {
    const score = blendedScore(m.affinity, effective);
    return { m, score, tier: tierFor(score) };
  });

  // Guard: the favoured family (both families when balanced) has at least one "best" metal.
  const favoured = dir === null ? (["warm", "cool"] as const) : [dir];
  for (const family of favoured) {
    const members = scored.filter((s) => s.m.family === family);
    const top = members.reduce<(typeof members)[number] | undefined>(
      (a, b) => (!a || b.score > a.score || (b.score === a.score && b.m.order < a.m.order) ? b : a),
      undefined,
    );
    if (top) top.tier = "best";
  }
  // Guard: a leaning result keeps the other family at "good" or better.
  if (dir !== null && isLean(effective)) {
    for (const s of scored) {
      if (s.m.family !== "mixed" && s.m.family !== dir && s.tier === "care") s.tier = "good";
    }
  }

  // Balanced: within a tier, data order only (interleaved families), so neither family leads.
  // Directional: higher score first, then data order.
  scored.sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      (dir === null ? 0 : b.score - a.score) ||
      a.m.order - b.m.order,
  );
  return scored.map(({ m, tier }) => ({
    id: m.id,
    tier,
    reasonKey: reasons[relationOf(m, dir)][tier],
  }));
}

// ─── Styles ───────────────────────────────────────────────────────────────────────────────

function styleMatches(item: StyleItem, effective: UndertoneLabel, depth: DepthLabel): boolean {
  return (
    (!item.depths || item.depths.includes(depth)) &&
    (!item.undertones || item.undertones.includes(effective))
  );
}

/** Number of filters an item has: more specific advice comes first. */
const specificity = (item: StyleItem) => (item.depths ? 1 : 0) + (item.undertones ? 1 : 0);

export function selectStyles(
  categories: RecommendData["styles"]["categories"],
  effective: UndertoneLabel,
  depth: DepthLabel,
): Record<Category, StyleSuggestion[]> {
  const out = {} as Record<Category, StyleSuggestion[]>;
  for (const category of CATEGORIES) {
    out[category] = categories[category]
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => styleMatches(item, effective, depth))
      .sort((a, b) => specificity(b.item) - specificity(a.item) || a.index - b.index)
      .slice(0, STYLES_PER_CATEGORY)
      .map(({ item }) => ({ id: item.id, tags: [...item.tags], labelKey: item.labelKey }));
  }
  return out;
}

// ─── Gemstones ────────────────────────────────────────────────────────────────────────────

export function selectGemstones(
  gemstones: RecommendData["gemstones"],
  effective: UndertoneLabel,
): string[] {
  return gemstones
    .map((g) => ({ g, score: blendedScore(g.affinity, effective) }))
    .filter(({ score }) => score >= GEMSTONE_MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.g.order - b.g.order)
    .slice(0, GEMSTONES_MAX)
    .map(({ g }) => g.id);
}

// ─── Entry point ──────────────────────────────────────────────────────────────────────────

function checkInput(input: RecommendInput): void {
  const { confidence, mstApprox, depth } = input;
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new RangeError(`recommend: confidence must be within 0–1, got ${confidence}`);
  }
  if (!Number.isInteger(mstApprox) || mstApprox < 1 || mstApprox > 10) {
    throw new RangeError(`recommend: mstApprox must be an integer 1–10, got ${mstApprox}`);
  }
  if (labelForMst(mstApprox) !== depth) {
    throw new RangeError(`recommend: MST ${mstApprox} doesn't belong to depth "${depth}"`);
  }
}

export function recommend(input: RecommendInput, data: RecommendData): Recommendation {
  checkInput(input);
  const uncertain = input.confidence < LOW_CONFIDENCE_THRESHOLD;
  const effective: UndertoneLabel = uncertain ? "neutral" : input.undertone;

  const notes: RecommendationNote[] = [...new Set(input.notes)];
  if (uncertain) notes.push("bothCanWorkUncertain");
  else if (effective === "neutral") notes.push("bothCanWork");

  return {
    undertone: input.undertone,
    depth: input.depth,
    mstApprox: input.mstApprox,
    confidence: input.confidence,
    summaryKey: data.explanations.summaries[uncertain ? "uncertain" : effective],
    finishKey: data.styles.finishes[input.depth],
    metals: rankMetals(data.metals, effective, data.explanations.metalReasons),
    styles: selectStyles(data.styles.categories, effective, input.depth),
    gemstones: selectGemstones(data.gemstones, effective),
    notes,
  };
}
