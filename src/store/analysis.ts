/**
 * The photo analysis on /analyze (M6b-1). Holds the progress while the worker runs and then the
 * result: a quality report and a numbers-only photo summary (src/lib/analysis/pipeline.ts). The
 * photo itself is released as soon as the analysis finishes (./flow), so after that this store
 * is all that's left of it. Memory only, never storage; gone on reload or "Start again".
 */
import { create } from "zustand";
import type { BlockingReason, PhotoAnalysis } from "@/lib/analysis/pipeline";
import type { QualityIssue } from "@/lib/analysis/quality";
import type { PhotoSummary } from "@/lib/analysis/score";
import type { AnalysisStage } from "@/workers/landmarker.protocol";

/** Size the photo was analysed at, after EXIF orientation and downscaling (numbers only). */
export type AnalysedSize = { width: number; height: number };

/** `load`: the analysis tool (WASM/model/worker) failed or timed out; the photo is kept to retry. */
export type AnalysisFailure = "decode" | "load";

export type AnalysisPhase =
  | { status: "idle" }
  | { status: "running"; stage: AnalysisStage; slow: boolean }
  | { status: "failed"; reason: AnalysisFailure }
  | { status: "blocked"; reason: BlockingReason; size: AnalysedSize }
  /** Warnings found: the user chooses "Analyse anyway" (→ done) or another photo. */
  | { status: "review"; warnings: QualityIssue[]; summary: PhotoSummary; size: AnalysedSize }
  /** Usable result; `warnings` were accepted with "Analyse anyway" (they lower confidence). */
  | { status: "done"; warnings: QualityIssue[]; summary: PhotoSummary; size: AnalysedSize };

type AnalysisState = {
  phase: AnalysisPhase;
  start: () => void;
  setStage: (stage: AnalysisStage) => void;
  markSlow: () => void;
  /** Store the worker's result: blocked, review (warnings) or done (no warnings). */
  finish: (analysis: PhotoAnalysis, size: AnalysedSize) => void;
  fail: (reason: AnalysisFailure) => void;
  /** "Analyse anyway": accept the warnings of a photo under review. */
  acceptWarnings: () => void;
  reset: () => void;
};

const IDLE: AnalysisPhase = { status: "idle" };

export const useAnalysisStore = create<AnalysisState>()((set, get) => ({
  phase: IDLE,
  start: () => set({ phase: { status: "running", stage: "preparing", slow: false } }),
  setStage: (stage) => {
    const { phase } = get();
    if (phase.status !== "running") return;
    // The slow note belongs to the download; it goes once the next stage starts.
    set({ phase: { status: "running", stage, slow: stage === "loading-model" && phase.slow } });
  },
  markSlow: () => {
    const { phase } = get();
    if (phase.status === "running" && phase.stage === "loading-model") {
      set({ phase: { ...phase, slow: true } });
    }
  },
  finish: (analysis, size) => {
    if (analysis.kind === "blocked") {
      set({ phase: { status: "blocked", reason: analysis.reason, size } });
      return;
    }
    const { warnings, summary } = analysis;
    set({ phase: { status: warnings.length ? "review" : "done", warnings, summary, size } });
  },
  fail: (reason) => set({ phase: { status: "failed", reason } }),
  acceptWarnings: () => {
    const { phase } = get();
    if (phase.status === "review") set({ phase: { ...phase, status: "done" } });
  },
  reset: () => set({ phase: IDLE }),
}));

/** The usable photo summary, once the user has a result (no warnings, or accepted ones). */
export function selectSummary(state: { phase: AnalysisPhase }): PhotoSummary | null {
  return state.phase.status === "done" ? state.phase.summary : null;
}
