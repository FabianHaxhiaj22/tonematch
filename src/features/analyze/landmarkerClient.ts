/**
 * Main-thread client for the landmarker worker. Creates the worker lazily, on the first request,
 * so the WASM and model only load when a photo is analysed (SPEC §11), and turns messages into
 * Promises.
 */
import type { PhotoAnalysis } from "@/lib/analysis/pipeline";
import type {
  AnalysisStage,
  DetectResponse,
  WorkerErrorCode,
  WorkerRequest,
  WorkerResponse,
} from "@/workers/landmarker.protocol";
import { ANALYSIS_TIMEOUT_MS, DETECT_TIMEOUT_MS } from "./config";

/** A failed request. `timeout` and `worker` (the worker itself crashed) are added on this side. */
export class LandmarkerError extends Error {
  constructor(
    readonly code: WorkerErrorCode | "timeout" | "worker" | "disposed",
    message: string,
  ) {
    super(message);
    this.name = "LandmarkerError";
  }
}

export type AnalysisResult = { analysis: PhotoAnalysis; width: number; height: number };

type Pending = {
  onMessage: (msg: WorkerResponse) => void;
  reject: (e: LandmarkerError) => void;
  timer: ReturnType<typeof setTimeout>;
};

export class LandmarkerClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL("../../workers/landmarker.worker.ts", import.meta.url), {
        type: "module",
        name: "landmarker",
      });
      this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data);
      this.worker.onerror = (event) => {
        this.failAll(
          new LandmarkerError("worker", `Landmarker worker error: ${event.message || "unknown"}`),
        );
        // A crashed worker can't be trusted with the next request: start a fresh one then.
        this.worker?.terminate();
        this.worker = null;
      };
    }
    return this.worker;
  }

  private handle(msg: WorkerResponse): void {
    this.pending.get(msg.id)?.onMessage(msg);
  }

  private settle(id: number): void {
    const p = this.pending.get(id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(id);
  }

  private failAll(error: LandmarkerError): void {
    for (const [id, p] of this.pending) {
      this.settle(id);
      p.reject(error);
    }
  }

  private request<T>(
    message: (id: number) => { request: WorkerRequest; transfer: Transferable[] },
    timeoutMs: number,
    onMessage: (msg: WorkerResponse, done: (value: T) => void) => void,
  ): Promise<T> {
    const worker = this.getWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.settle(id);
        reject(new LandmarkerError("timeout", `Landmarker timed out after ${timeoutMs} ms`));
      }, timeoutMs);
      const done = (value: T) => {
        this.settle(id);
        resolve(value);
      };
      this.pending.set(id, {
        timer,
        reject,
        onMessage: (msg) => {
          if (msg.type === "error") {
            this.settle(id);
            reject(new LandmarkerError(msg.code, msg.message));
          } else onMessage(msg, done);
        },
      });
      const { request, transfer } = message(id);
      worker.postMessage(request, transfer);
    });
  }

  /**
   * Analyse a photo in the worker (M6b): decode with EXIF orientation, downscale, landmarks,
   * quality checks, skin sampling. Resolves with numbers only. `onProgress` gets each stage.
   */
  analyse(
    photo: Blob,
    onProgress?: (stage: AnalysisStage) => void,
    timeoutMs = ANALYSIS_TIMEOUT_MS,
  ): Promise<AnalysisResult> {
    return this.request<AnalysisResult>(
      (id) => ({ request: { type: "analyse", id, photo }, transfer: [] }),
      timeoutMs,
      (msg, done) => {
        if (msg.type === "progress") onProgress?.(msg.stage);
        else if (msg.type === "analysis") {
          done({ analysis: msg.analysis, width: msg.width, height: msg.height });
        }
      },
    );
  }

  /**
   * Dev-only: detect faces in an image. The bitmap is transferred (not copied) to the worker,
   * which closes it after use, so the caller must not use it afterwards.
   */
  detect(image: ImageBitmap): Promise<DetectResponse> {
    return this.request<DetectResponse>(
      (id) => ({ request: { type: "detect", id, image }, transfer: [image] }),
      DETECT_TIMEOUT_MS,
      (msg, done) => {
        if (msg.type === "result") done(msg);
      },
    );
  }

  /** Stop the worker and reject anything still pending. */
  dispose(): void {
    this.failAll(new LandmarkerError("disposed", "Landmarker disposed"));
    this.worker?.terminate();
    this.worker = null;
  }
}
