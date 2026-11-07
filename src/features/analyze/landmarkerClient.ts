/**
 * Main-thread client for the landmarker worker. Creates the worker lazily (so the model only
 * loads on pages that analyse a photo) and turns messages into Promises.
 */
import type { DetectResponse, WorkerRequest, WorkerResponse } from "@/workers/landmarker.protocol";

/** First call includes downloading ~33 MB of WASM + model, so allow generous time. */
const DETECT_TIMEOUT_MS = 60_000;

type Pending = {
  resolve: (r: DetectResponse) => void;
  reject: (e: Error) => void;
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
        this.failAll(new Error(`Landmarker worker error: ${event.message || "unknown"}`));
      };
    }
    return this.worker;
  }

  private handle(msg: WorkerResponse): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(msg.id);
    if (msg.type === "result") p.resolve(msg);
    else p.reject(new Error(msg.message));
  }

  private failAll(error: Error): void {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(error);
      this.pending.delete(id);
    }
  }

  /**
   * Detect faces in an image. The bitmap is transferred (not copied) to the worker, which closes
   * it after use, so the caller must not use it afterwards.
   */
  detect(image: ImageBitmap): Promise<DetectResponse> {
    const worker = this.getWorker();
    const id = this.nextId++;
    return new Promise<DetectResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Landmarker timed out after ${DETECT_TIMEOUT_MS} ms`));
      }, DETECT_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      const request: WorkerRequest = { type: "detect", id, image };
      worker.postMessage(request, [image]);
    });
  }

  /** Stop the worker and reject anything still pending. */
  dispose(): void {
    this.failAll(new Error("Landmarker disposed"));
    this.worker?.terminate();
    this.worker = null;
  }
}
