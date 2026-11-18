/**
 * Recommendation engine configuration (README §7). Every threshold used by src/lib/recommend
 * lives here as a named, commented constant (each module owns its config; CLAUDE.md rule 8).
 * **Initial values are styling heuristics**, not measurements: tune them with the calibration
 * set (docs/CALIBRATION.md) and change them here, never inline in the logic.
 */

/**
 * Below this overall confidence (0–1, from M4) the engine doesn't rank one metal family over
 * the other: it recommends as if the undertone were neutral, shows both families as "best" and
 * adds the `bothCanWorkUncertain` note (D-030). Exactly at the threshold ranks normally.
 * 0.5 ≈ "less likely right than wrong"; with D-029's formulas a 2 + 2 split quiz (40%) and an
 * uncalibrated photo with a strongly disagreeing quiz land below it.
 */
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

/**
 * Leaning buckets (neutral-warm / neutral-cool) score each item as
 *   LEAN_WEIGHT × (warm or cool affinity) + (1 − LEAN_WEIGHT) × neutral affinity.
 * 0.5 sits halfway between "neutral" and the full warm/cool column.
 */
export const LEAN_WEIGHT = 0.5;

/**
 * Metal tiers from the blended affinity score (0–1). Then the engine's guard rules apply
 * (README §7, D-030): the favoured family always has a "best" metal, the other family is never
 * below "good" in a leaning bucket, and both families get a "best" metal when balanced.
 */
export const TIER_BEST_MIN = 0.8;
export const TIER_GOOD_MIN = 0.55;

/** Style suggestions shown per category (rings, earrings, necklaces, bracelets). */
export const STYLES_PER_CATEGORY = 3;

/** Gemstones whose blended affinity reaches this score are suggested… */
export const GEMSTONE_MIN_SCORE = 0.7;
/** …at most this many, best scores first. */
export const GEMSTONES_MAX = 6;
