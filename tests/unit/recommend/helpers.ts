import type { ConfidenceNote } from "@/lib/analysis/confidence";
import { DEPTH_SCALE, type DepthLabel } from "@/lib/analysis/config";
import type { UndertoneLabel } from "@/lib/analysis/undertone";
import { loadRecommendData } from "@/lib/recommend/data";
import type { RecommendInput } from "@/lib/recommend/engine";
import type { RecommendData } from "@/lib/recommend/schema";

export const DATA = loadRecommendData();

/** A fresh, deep copy of the real data, for tests that tamper with it. */
export const cloneData = (): RecommendData => structuredClone(DATA);

/** Every MST index that belongs to a depth label (from the one depth table, D-029). */
export const mstsFor = (depth: DepthLabel): number[] =>
  DEPTH_SCALE.filter((r) => r.label === depth).map((r) => r.mst);

export const CONFIDENT = 0.8;
export const UNCERTAIN = 0.49;

export function input(
  undertone: UndertoneLabel,
  depth: DepthLabel,
  confidence = CONFIDENT,
  notes: ConfidenceNote[] = [],
): RecommendInput {
  return { undertone, depth, mstApprox: mstsFor(depth)[0]!, confidence, notes };
}
