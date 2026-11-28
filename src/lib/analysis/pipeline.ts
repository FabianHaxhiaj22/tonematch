/**
 * The photo analysis in one call (M6b, SPEC §5): detected faces + pixels → quality report and a
 * numbers-only photo summary. Pure. The worker (src/workers/landmarker.worker.ts) runs it next to
 * the landmarker, so the pixels never leave the worker and only this result reaches the page.
 */
import type { FlatMatrix } from "./matrix";
import type { RgbaImage } from "./image";
import { assessQuality, type QualityIssue } from "./quality";
import { sampleSkin } from "./sampler";
import { summarizePhoto, type PhotoSummary } from "./score";

/** A detected face as MediaPipe returns it: landmarks normalised to [0, 1] of the image. */
export type DetectedFace = {
  landmarks: readonly { x: number; y: number }[];
  matrix: FlatMatrix | null;
};

/**
 * Why a photo can't be used. NO_FACE and MULTIPLE_FACES are the quality gate's blocking issues
 * (SPEC §6.1). NOT_ENOUGH_SKIN: one face, but no skin region kept enough pixels for a colour
 * (e.g. a tiny face or hair over the cheeks and forehead); without a colour there is nothing to
 * "analyse anyway", so it blocks too.
 */
export type BlockingReason = "NO_FACE" | "MULTIPLE_FACES" | "NOT_ENOUGH_SKIN";

export type PhotoAnalysis =
  | { kind: "blocked"; reason: BlockingReason }
  /** `warnings` empty = the photo passed every check. */
  | { kind: "analysed"; warnings: QualityIssue[]; summary: PhotoSummary };

export function analysePhoto(img: RgbaImage, faces: readonly DetectedFace[]): PhotoAnalysis {
  const facesPx = faces.map((f) => ({
    landmarksPx: f.landmarks.map((p) => ({ x: p.x * img.width, y: p.y * img.height })),
    matrix: f.matrix,
  }));
  const quality = assessQuality(img, facesPx);
  const blocking = quality.issues.find((i) => i.severity === "blocking");
  if (blocking) {
    return { kind: "blocked", reason: blocking.code === "NO_FACE" ? "NO_FACE" : "MULTIPLE_FACES" };
  }
  const summary = summarizePhoto(sampleSkin(img, facesPx[0]!.landmarksPx), quality);
  if (!summary) return { kind: "blocked", reason: "NOT_ENOUGH_SKIN" };
  return {
    kind: "analysed",
    warnings: quality.issues.filter((i) => i.severity === "warning"),
    summary,
  };
}
