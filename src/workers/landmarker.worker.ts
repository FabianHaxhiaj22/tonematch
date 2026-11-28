/// <reference lib="webworker" />
/**
 * Face Landmarker in a module Web Worker (SPEC §5), so the UI thread never blocks.
 *
 * Self-hosted files only (SPEC §4): WASM and model from the versioned /models/<version>/ folder
 * (src/lib/models; filled by `pnpm models:fetch`). No CDN.
 *
 * Worker type (open risk R-002, verified in M2): although the client asks for `type: "module"`,
 * Turbopack bootstraps workers as *classic* scripts (its turbopack-worker chunk loads the bundle
 * with importScripts). In a classic worker MediaPipe's importScripts() succeeds, so we must use
 * the classic WASM loader (vision_wasm_internal.js), whose `var ModuleFactory` becomes a worker
 * global: forVisionTasks(..., useModule = false). The ES-module loader fails there with
 * "Cannot use 'import.meta' outside a module". If Turbopack ever starts real module workers,
 * this fails loudly with MediaPipe's "ModuleFactory not set" error; switch USE_MODULE_LOADER.
 *
 * Two requests:
 * - `analyse` (the app, M6b): photo File in → numbers out. Decoding, EXIF orientation,
 *   downscaling, landmarks, quality checks and skin sampling all happen here, so the pixels never
 *   reach the page. They are dropped when the request finishes (SPEC §5).
 * - `detect` (dev-only /dev/landmarks): landmarks for a bitmap the dev page keeps.
 *
 * Setup follows the official guide:
 * https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { analysePhoto } from "@/lib/analysis/pipeline";
import { ANALYSIS_MAX_LONG_SIDE_PX, fitLongSide } from "@/lib/image";
import { MODEL_PATHS } from "@/lib/models";
import type {
  AnalysisStage,
  FaceResult,
  WorkerErrorCode,
  WorkerRequest,
  WorkerResponse,
} from "./landmarker.protocol";

/** Classic loader for Turbopack's classic worker bootstrap (see header comment). */
const USE_MODULE_LOADER = false;
/**
 * Detect up to 2 faces: we only need to know whether there is more than one (the quality gate
 * reports MULTIPLE_FACES, SPEC §6.1). Analysis uses a single face.
 */
const MAX_FACES = 2;

declare const self: DedicatedWorkerGlobalScope;

let landmarkerPromise: Promise<FaceLandmarker> | null = null;
/** Set once the landmarker has loaded (so `loading-model` is only reported the first time). */
let landmarkerReady = false;

/** An error with a code the page can turn into a friendly message. */
class StageError extends Error {
  constructor(
    readonly code: WorkerErrorCode,
    cause: unknown,
  ) {
    super(cause instanceof Error ? cause.message : String(cause));
  }
}

async function getLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(MODEL_PATHS.wasm, USE_MODULE_LOADER);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATHS.model, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: MAX_FACES,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });
  })();
  try {
    const landmarker = await landmarkerPromise;
    landmarkerReady = true;
    return landmarker;
  } catch (err) {
    landmarkerPromise = null; // allow a retry after a failed load
    throw new StageError("model", err);
  }
}

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

function toFaces(result: ReturnType<FaceLandmarker["detect"]>): FaceResult[] {
  return result.faceLandmarks.map((points, i) => {
    const m = result.facialTransformationMatrixes[i];
    return {
      landmarks: points.map(({ x, y, z }) => ({ x, y, z })),
      matrix: m ? { rows: m.rows, columns: m.columns, data: Array.from(m.data) } : null,
    };
  });
}

/**
 * Decode with EXIF orientation applied ("from-image", also the spec default; D-035) and draw at
 * most ANALYSIS_MAX_LONG_SIDE_PX on the long side. Returns the pixels; the bitmap is closed.
 */
async function preparePixels(photo: Blob): Promise<ImageData> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(photo, { imageOrientation: "from-image" });
  } catch (err) {
    throw new StageError("decode", err);
  }
  try {
    const size = fitLongSide(bitmap.width, bitmap.height, ANALYSIS_MAX_LONG_SIDE_PX);
    const canvas = new OffscreenCanvas(size.width, size.height);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D canvas not available in the worker");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    return ctx.getImageData(0, 0, size.width, size.height);
  } finally {
    bitmap.close();
  }
}

async function analyse(id: number, photo: Blob): Promise<void> {
  const progress = (stage: AnalysisStage) => post({ type: "progress", id, stage });
  progress("preparing");
  let pixels: ImageData | null = await preparePixels(photo);
  // Load the model only now: MediaPipe fetches its loader with importScripts, which blocks this
  // thread, so loading in parallel would freeze the "preparing" stage on a slow connection.
  if (!landmarkerReady) progress("loading-model");
  const landmarker = await getLandmarker();
  progress("finding-face");
  const faces = toFaces(landmarker.detect(pixels));
  progress("checking");
  const analysis = analysePhoto(pixels, faces);
  const { width, height } = pixels;
  pixels = null; // the last reference to the photo's pixels in this worker
  post({ type: "analysis", id, analysis, width, height });
}

function detect(id: number, image: ImageBitmap): void {
  // Dev-only path; loading errors are reported like any other.
  void (async () => {
    try {
      const initStart = performance.now();
      const alreadyLoaded = landmarkerReady;
      const landmarker = await getLandmarker();
      const initMs = alreadyLoaded ? 0 : performance.now() - initStart;
      const detectStart = performance.now();
      const result = landmarker.detect(image);
      const detectMs = performance.now() - detectStart;
      post({
        type: "result",
        id,
        faces: toFaces(result),
        imageWidth: image.width,
        imageHeight: image.height,
        detectMs,
        initMs,
      });
    } catch (err) {
      postError(id, err);
    } finally {
      image.close(); // free the transferred bitmap; the image itself is never kept (SPEC §5)
    }
  })();
}

function postError(id: number, err: unknown): void {
  const code = err instanceof StageError ? err.code : "unknown";
  post({ type: "error", id, code, message: err instanceof Error ? err.message : String(err) });
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type === "detect") detect(msg.id, msg.image);
  else if (msg.type === "analyse")
    analyse(msg.id, msg.photo).catch((err) => postError(msg.id, err));
};
