/**
 * Region weights for the overall skin colour (README §6.2, DECISIONS D-026). Normally cheeks
 * 0.4 + 0.4 and forehead 0.2; when the cheeks are doubtful the forehead counts for more.
 * Pure: works on region medians and flags only.
 */
import { hueAngle, type Lab } from "@/lib/color";
import {
  CHEEK_CHROMATIC_DISAGREEMENT,
  CHEEK_REDNESS_A_MARGIN,
  CHEEK_REDNESS_HUE_MARGIN_DEG,
  FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL,
  REGION_WEIGHTS,
  type RegionName,
} from "./config";
import { hueDelta } from "./stats";

/** Why the forehead got more weight. Internal reason codes, never shown as "makeup". */
export type WeightReason = "cheekRedness" | "cheekDropped" | "cheekDisagreement";

export type WeightInput = {
  /** Region medians (null when a region had no valid pixels). */
  medians: Record<RegionName, Lab | null>;
  /** Regions with enough valid pixels and not dropped for imbalance. */
  usable: readonly RegionName[];
  /** Colour part of the cheek difference, sqrt(Δa*² + Δb*²); null if not comparable. */
  cheekChromatic: number | null;
};

export type WeightChoice = {
  /** Weights over `usable`, summing to 1 (0 for unusable regions). */
  weights: Record<RegionName, number>;
  reasons: WeightReason[];
};

const CHEEKS = ["rightCheek", "leftCheek"] as const;

/**
 * True if a cheek looks redder than the forehead: a* higher by more than the margin, or hue
 * angle lower by more than the margin. Relative to the same face, so independent of depth.
 * Blush, bronzer and natural flushing all trigger it.
 */
export function cheekRedderThanForehead(cheek: Lab, forehead: Lab): boolean {
  if (cheek.a - forehead.a > CHEEK_REDNESS_A_MARGIN) return true;
  return hueDelta(hueAngle(forehead), hueAngle(cheek)) > CHEEK_REDNESS_HUE_MARGIN_DEG;
}

export function chooseRegionWeights(input: WeightInput): WeightChoice {
  const { medians, usable, cheekChromatic } = input;
  const reasons: WeightReason[] = [];
  const forehead = usable.includes("forehead") ? medians.forehead : null;
  const usableCheeks = CHEEKS.filter((c) => usable.includes(c));

  if (forehead) {
    if (usableCheeks.some((c) => medians[c] && cheekRedderThanForehead(medians[c]!, forehead))) {
      reasons.push("cheekRedness");
    }
    if (usableCheeks.length < 2) reasons.push("cheekDropped");
    if (cheekChromatic !== null && cheekChromatic > CHEEK_CHROMATIC_DISAGREEMENT) {
      reasons.push("cheekDisagreement");
    }
  }

  const weights: Record<RegionName, number> = { rightCheek: 0, leftCheek: 0, forehead: 0 };
  if (forehead && reasons.length > 0 && usableCheeks.length > 0) {
    weights.forehead = FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL;
    for (const c of usableCheeks) {
      weights[c] = (1 - FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL) / usableCheeks.length;
    }
    return { weights, reasons };
  }
  // Normal weights, renormalised over the usable regions.
  const total = usable.reduce((s, n) => s + REGION_WEIGHTS[n], 0);
  for (const n of usable) weights[n] = total > 0 ? REGION_WEIGHTS[n] / total : 0;
  return { weights, reasons };
}
