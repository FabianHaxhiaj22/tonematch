/**
 * Message protocol between the main thread and src/workers/landmarker.worker.ts.
 * Only plain, structured-cloneable data crosses the boundary (plus the transferred ImageBitmap of
 * the dev-only `detect` request, or the photo File of `analyse`).
 */

import type { FlatMatrix } from "@/lib/analysis/matrix";
import type { PhotoAnalysis } from "@/lib/analysis/pipeline";

/** One landmark, normalised: x and y in [0, 1] of image width/height; z is relative depth. */
export type Landmark = { x: number; y: number; z: number };

export type FaceResult = {
  /** 478 landmarks per face (SPEC §6.2). */
  landmarks: Landmark[];
  /** Facial transformation matrix (canonical face → detected face), 4×4, column-major data. */
  matrix: FlatMatrix | null;
};

/** Dev-only (/dev/landmarks): landmarks for an image the page keeps. */
export type DetectRequest = { type: "detect"; id: number; image: ImageBitmap };

/**
 * The app's analysis (M6b): the worker decodes the photo (EXIF orientation applied), downscales
 * it, finds the face, checks quality and samples the skin. Only numbers come back; the pixels
 * never leave the worker and are dropped when it finishes.
 */
export type AnalyseRequest = { type: "analyse"; id: number; photo: Blob };

export type WorkerRequest = DetectRequest | AnalyseRequest;

export type DetectResponse = {
  type: "result";
  id: number;
  faces: FaceResult[];
  imageWidth: number;
  imageHeight: number;
  /** Time spent in detect(), ms (excludes model load). */
  detectMs: number;
  /** Time spent loading WASM + model on first use, ms (0 when already loaded). */
  initMs: number;
};

/**
 * Where an analysis is, in order. `loading-model` is only reported when the WASM and model aren't
 * loaded yet in this worker (the first photo of a visit).
 */
export const ANALYSIS_STAGES = ["preparing", "loading-model", "finding-face", "checking"] as const;
export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export type ProgressMessage = { type: "progress"; id: number; stage: AnalysisStage };

export type AnalyseResponse = {
  type: "analysis";
  id: number;
  analysis: PhotoAnalysis;
  /** Size the photo was analysed at (after orientation and downscaling). */
  width: number;
  height: number;
};

/** `decode`: the browser couldn't read the photo. `model`: the WASM or model didn't load. */
export type WorkerErrorCode = "decode" | "model" | "unknown";

export type ErrorResponse = { type: "error"; id: number; code: WorkerErrorCode; message: string };

export type WorkerResponse = DetectResponse | AnalyseResponse | ProgressMessage | ErrorResponse;
