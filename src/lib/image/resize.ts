/**
 * Target size for the analysis image (D-035). Pure, so the worker's downscale step is tested
 * here; the drawing itself happens on an OffscreenCanvas in src/workers/landmarker.worker.ts.
 */

export type FittedSize = {
  width: number;
  height: number;
  /** Factor applied to both sides (1 when the image already fits). */
  scale: number;
};

/**
 * Scale (width × height) so that its longer side is at most `maxLongSide`, keeping the aspect
 * ratio. Never enlarges. Sides are rounded to whole pixels and are at least 1.
 */
export function fitLongSide(width: number, height: number, maxLongSide: number): FittedSize {
  for (const [name, v] of [
    ["width", width],
    ["height", height],
    ["maxLongSide", maxLongSide],
  ] as const) {
    if (!Number.isFinite(v) || v <= 0) throw new RangeError(`${name} must be a positive number`);
  }
  const scale = Math.min(1, maxLongSide / Math.max(width, height));
  if (scale === 1) return { width: Math.round(width), height: Math.round(height), scale };
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}
