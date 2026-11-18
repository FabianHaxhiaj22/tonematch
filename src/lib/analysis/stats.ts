/** Small, pure statistics helpers. */
import type { Lab } from "@/lib/color";

/** Median of a non-empty list (mean of the two middle values for even lengths). */
export function median(values: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0) throw new RangeError("median: empty input");
  const s = Float64Array.from(values).sort();
  const mid = n >> 1;
  return n % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Lower weighted median: the smallest value whose cumulative weight reaches half the total.
 * Weights must be ≥ 0 with a positive sum.
 */
export function weightedMedian(values: ArrayLike<number>, weights: ArrayLike<number>): number {
  const n = values.length;
  if (n === 0 || n !== weights.length) {
    throw new RangeError("weightedMedian: values and weights must be non-empty and equal length");
  }
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => values[a]! - values[b]!);
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (!(weights[i]! >= 0)) throw new RangeError("weightedMedian: weights must be ≥ 0");
    total += weights[i]!;
  }
  if (!(total > 0)) throw new RangeError("weightedMedian: total weight must be > 0");
  let acc = 0;
  for (const i of order) {
    acc += weights[i]!;
    if (acc >= total / 2) return values[i]!;
  }
  // Only reachable if floating-point summation order leaves acc a hair below total / 2.
  /* v8 ignore next */
  return values[order[n - 1]!]!;
}

/** CIE76 colour difference ΔE*ab. */
export function deltaE76(p: Lab, q: Lab): number {
  return Math.hypot(p.L - q.L, p.a - q.a, p.b - q.b);
}
