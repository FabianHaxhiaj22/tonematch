/** A controllable stand-in for the landmarker worker client, and canned analysis results. */
import type { PhotoAnalysis } from "@/lib/analysis/pipeline";
import type { PhotoSummary } from "@/lib/analysis/score";
import type { AnalysisResult } from "@/features/analyze/landmarkerClient";
import type { Analyser } from "@/features/analyze/runAnalysis";
import type { AnalysisStage } from "@/workers/landmarker.protocol";

export const SUMMARY: PhotoSummary = {
  skin: { L: 62, a: 13, b: 19 },
  evidence: {
    overriddenIssues: [],
    usedPixels: 5000,
    lowPixelRegionCount: 0,
    cheekImbalance: false,
    cheekChromatic: 1,
    unevenLighting: false,
    cheekRedness: false,
    calibrated: false,
  },
};

export const WARNINGS = [
  { code: "FACE_TOO_SMALL", severity: "warning", value: 0.2, limit: 0.25 },
  { code: "TOO_DARK", severity: "warning", value: 70, limit: 90 },
] as const;

export const PASSED: PhotoAnalysis = { kind: "analysed", warnings: [], summary: SUMMARY };
export const SMALL_AND_DARK: PhotoAnalysis = {
  kind: "analysed",
  warnings: WARNINGS.map((w) => ({ ...w })),
  summary: SUMMARY,
};
export const NO_FACE: PhotoAnalysis = { kind: "blocked", reason: "NO_FACE" };

export type Call = {
  photo: Blob;
  progress: (stage: AnalysisStage) => void;
  resolve: (analysis: PhotoAnalysis, size?: { width: number; height: number }) => void;
  reject: (err: Error) => void;
};

export function fakeAnalyser(): { analyser: Analyser; calls: Call[] } {
  const calls: Call[] = [];
  const analyser: Analyser = {
    analyse: (photo, progress) =>
      new Promise<AnalysisResult>((res, reject) => {
        calls.push({
          photo,
          progress,
          resolve: (analysis, size = { width: 1280, height: 1600 }) => res({ analysis, ...size }),
          reject,
        });
      }),
  };
  return { analyser, calls };
}
