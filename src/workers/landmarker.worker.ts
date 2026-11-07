/// <reference lib="webworker" />
/**
 * Face Landmarker in a module Web Worker (README §5), so the UI thread never blocks.
 *
 * Self-hosted files only (README §4): WASM from /models/wasm, model from /models (filled by
 * `pnpm models:fetch`). No CDN.
 *
 * Worker type (open risk R-002, verified in M2): although the client asks for `type: "module"`,
 * Turbopack bootstraps workers as *classic* scripts (its turbopack-worker chunk loads the bundle
 * with importScripts). In a classic worker MediaPipe's importScripts() succeeds, so we must use
 * the classic WASM loader (vision_wasm_internal.js), whose `var ModuleFactory` becomes a worker
 * global: forVisionTasks(..., useModule = false). The ES-module loader fails there with
 * "Cannot use 'import.meta' outside a module". If Turbopack ever starts real module workers,
 * this fails loudly with MediaPipe's "ModuleFactory not set" error; switch USE_MODULE_LOADER.
 *
 * Setup follows the official guide:
 * https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js
 */
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceResult, WorkerRequest, WorkerResponse } from "./landmarker.protocol";

const WASM_BASE_PATH = "/models/wasm";
const MODEL_PATH = "/models/face_landmarker.task";
/** Classic loader for Turbopack's classic worker bootstrap (see header comment). */
const USE_MODULE_LOADER = false;
/**
 * Detect up to 2 faces: we only need to know whether there is more than one (the quality gate
 * reports MULTIPLE_FACES, README §6.1). Analysis uses a single face.
 */
const MAX_FACES = 2;

declare const self: DedicatedWorkerGlobalScope;

let landmarkerPromise: Promise<FaceLandmarker> | null = null;

async function getLandmarker(): Promise<FaceLandmarker> {
  landmarkerPromise ??= (async () => {
    const fileset = await FilesetResolver.forVisionTasks(WASM_BASE_PATH, USE_MODULE_LOADER);
    return FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate: "CPU" },
      runningMode: "IMAGE",
      numFaces: MAX_FACES,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: true,
    });
  })();
  try {
    return await landmarkerPromise;
  } catch (err) {
    landmarkerPromise = null; // allow a retry after a failed load
    throw err;
  }
}

function post(message: WorkerResponse): void {
  self.postMessage(message);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;
  if (msg.type !== "detect") return;
  const { id, image } = msg;
  try {
    const initStart = performance.now();
    const alreadyLoaded = landmarkerPromise !== null;
    const landmarker = await getLandmarker();
    const initMs = alreadyLoaded ? 0 : performance.now() - initStart;

    const detectStart = performance.now();
    const result = landmarker.detect(image);
    const detectMs = performance.now() - detectStart;

    const faces: FaceResult[] = result.faceLandmarks.map((points, i) => {
      const m = result.facialTransformationMatrixes[i];
      return {
        landmarks: points.map(({ x, y, z }) => ({ x, y, z })),
        matrix: m ? { rows: m.rows, columns: m.columns, data: Array.from(m.data) } : null,
      };
    });
    post({
      type: "result",
      id,
      faces,
      imageWidth: image.width,
      imageHeight: image.height,
      detectMs,
      initMs,
    });
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  } finally {
    image.close(); // free the transferred bitmap; the image itself is never kept (README §5)
  }
};
