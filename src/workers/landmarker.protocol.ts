/**
 * Message protocol between the main thread and src/workers/landmarker.worker.ts.
 * Only plain, structured-cloneable data crosses the boundary (plus the transferred ImageBitmap).
 */

import type { FlatMatrix } from "@/lib/analysis/matrix";

/** One landmark, normalised: x and y in [0, 1] of image width/height; z is relative depth. */
export type Landmark = { x: number; y: number; z: number };

export type FaceResult = {
  /** 478 landmarks per face (README §6.2). */
  landmarks: Landmark[];
  /** Facial transformation matrix (canonical face → detected face), 4×4, column-major data. */
  matrix: FlatMatrix | null;
};

export type DetectRequest = { type: "detect"; id: number; image: ImageBitmap };

export type WorkerRequest = DetectRequest;

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

export type ErrorResponse = { type: "error"; id: number; message: string };

export type WorkerResponse = DetectResponse | ErrorResponse;
