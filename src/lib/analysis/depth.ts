/**
 * Skin depth (SPEC §6.5, D-029). One blended depth angle (mostly L*, a little ITA) is mapped
 * through one table to an approximate MST index, and the label comes from that same row, so
 * label and MST can't contradict. Depth describes lightness only; it never feeds the undertone.
 */
import { ita, type Lab } from "@/lib/color";
import { DEPTH_ITA_WEIGHT, DEPTH_REF_B, DEPTH_SCALE, ITA_MIN_B, type DepthLabel } from "./config";

export type Depth = {
  label: DepthLabel;
  /** Monk Skin Tone index 1–10. **Approximate**: always label it so in the UI. */
  mstApprox: number;
  /** The blended depth angle used for the mapping (degrees). */
  angle: number;
  /** Measured ITA°, or null when b* was too small to compute it. */
  ita: number | null;
  /** "blend" normally; "lightness" when ITA couldn't be computed (L* only, less reliable). */
  method: "blend" | "lightness";
};

const RAD_TO_DEG = 180 / Math.PI;

/** ITA with a fixed, typical b*: an angle that depends on L* only. */
export function lightnessAngle(L: number): number {
  return Math.atan((L - 50) / DEPTH_REF_B) * RAD_TO_DEG;
}

/** The depth angle: DEPTH_ITA_WEIGHT × ITA + the rest × lightnessAngle; L* only without ITA. */
export function depthAngle(lab: Lab): { angle: number; ita: number | null } {
  const measured = ita(lab, ITA_MIN_B);
  const fromL = lightnessAngle(lab.L);
  const angle =
    measured === null ? fromL : DEPTH_ITA_WEIGHT * measured + (1 - DEPTH_ITA_WEIGHT) * fromL;
  return { angle, ita: measured };
}

/** The DEPTH_SCALE row for an angle (lightest row whose minAngle the angle reaches). */
export function depthRow(angle: number): (typeof DEPTH_SCALE)[number] {
  for (const row of DEPTH_SCALE) if (angle >= row.minAngle) return row;
  /* v8 ignore next */
  return DEPTH_SCALE[DEPTH_SCALE.length - 1]!;
}

/** The label that belongs to an MST index in DEPTH_SCALE. */
export function labelForMst(mst: number): DepthLabel {
  const row = DEPTH_SCALE.find((r) => r.mst === mst);
  if (!row) throw new RangeError(`labelForMst: no MST ${mst}`);
  return row.label;
}

export function depthFromLab(lab: Lab): Depth {
  const { angle, ita: measured } = depthAngle(lab);
  const row = depthRow(angle);
  return {
    label: row.label,
    mstApprox: row.mst,
    angle,
    ita: measured,
    method: measured === null ? "lightness" : "blend",
  };
}
