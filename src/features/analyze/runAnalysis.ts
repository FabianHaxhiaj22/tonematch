/**
 * Runs one photo analysis (M6b-1) and keeps the stores in step. Lives outside React on purpose:
 * Next 16 keeps visited routes mounted but hidden (React <Activity>), and hiding a route tears
 * down its effects, so a component-owned analysis would be cut off when the user glances at
 * another page.
 *
 * Privacy (SPEC §5): the photo File goes to the worker, numbers come back, and the photo is
 * released here as soon as the analysis finishes, whatever the outcome. Only a failed *load*
 * keeps it, so "Try again" doesn't make the user pick it again.
 */
import { useAnalysisStore } from "@/store/analysis";
import { useFlowStore, type FlowPhoto } from "@/store/flow";
import type { AnalysisStage } from "@/workers/landmarker.protocol";
import { SLOW_LOAD_MS } from "./config";
import { LandmarkerClient, LandmarkerError, type AnalysisResult } from "./landmarkerClient";

/** What runAnalysis needs from the worker client (a fake in unit tests). */
export type Analyser = {
  analyse: (photo: Blob, onProgress: (stage: AnalysisStage) => void) => Promise<AnalysisResult>;
};

let client: Analyser | null = null;
/** Only the latest run may write to the stores. */
let generation = 0;

/** Tests swap in a fake analyser; `null` goes back to the real worker client. */
export function setAnalyserForTests(fake: Analyser | null): void {
  client = fake;
}

/**
 * Analyse `photo` unless an analysis is already running or finished. Resolves when done; never
 * rejects (failures go to the analysis store).
 */
export async function runAnalysis(photo: FlowPhoto): Promise<void> {
  const analysis = useAnalysisStore.getState();
  if (analysis.phase.status !== "idle") return;
  const run = ++generation;
  // Stale if a newer run started, or the photo was replaced or cleared meanwhile.
  const current = () => run === generation && useFlowStore.getState().photo === photo;
  let slowTimer: ReturnType<typeof setTimeout> | undefined;

  analysis.start();
  try {
    client ??= new LandmarkerClient();
    const result = await client.analyse(photo.file, (stage) => {
      if (!current()) return;
      useAnalysisStore.getState().setStage(stage);
      clearTimeout(slowTimer);
      if (stage === "loading-model") {
        slowTimer = setTimeout(
          () => current() && useAnalysisStore.getState().markSlow(),
          SLOW_LOAD_MS,
        );
      }
    });
    if (!current()) return;
    const { analysis: outcome, width, height } = result;
    useAnalysisStore.getState().finish(outcome, { width, height });
    useFlowStore.getState().clearPhoto();
  } catch (err) {
    if (!current()) return;
    const decode = err instanceof LandmarkerError && err.code === "decode";
    useAnalysisStore.getState().fail(decode ? "decode" : "load");
    // An unreadable photo can't be retried, so release it; keep it after a load failure.
    if (decode) useFlowStore.getState().clearPhoto();
  } finally {
    clearTimeout(slowTimer);
  }
}

/** "Try again" after a failed load: back to idle, then analyse the kept photo. */
export function retryAnalysis(): void {
  const photo = useFlowStore.getState().photo;
  if (!photo) return;
  useAnalysisStore.getState().reset();
  void runAnalysis(photo);
}
