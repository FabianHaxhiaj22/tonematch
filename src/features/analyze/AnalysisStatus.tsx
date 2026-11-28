"use client";

import { LockIcon } from "@/components/icons";
import { useT } from "@/i18n/useT";
import { MODEL_DOWNLOAD_MB } from "@/lib/models";
import type { AnalysisStage } from "@/workers/landmarker.protocol";

/**
 * Progress while the worker analyses the photo (M6b-1): the current stage, the one-time download
 * note while the model loads, and a slow-connection note after SLOW_LOAD_MS. One polite live
 * region, so screen readers hear each stage once (SPEC §13: aria-live for analysis status).
 */
export function AnalysisStatus({ stage, slow }: { stage: AnalysisStage; slow: boolean }) {
  const t = useT();
  return (
    <div className="mt-6">
      {/* Decorative: the text below carries the same information. */}
      <div aria-hidden className="relative h-px w-full overflow-hidden bg-line">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-accent to-transparent motion-safe:animate-[tm-progress_1.6s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:opacity-40" />
      </div>
      <div role="status" className="mt-5">
        <p className="font-display text-[1.75rem] leading-tight">{t(`analyze.status.${stage}`)}…</p>
        {stage === "loading-model" && (
          <p className="mt-2 text-sm text-muted">
            {t("analyze.status.download", { size: MODEL_DOWNLOAD_MB })}
          </p>
        )}
        {slow && (
          <p className="mt-3 border-l-2 border-accent pl-3 text-sm text-ink">
            {t("analyze.status.slow")}
          </p>
        )}
      </div>
      <p className="mt-5 flex items-center gap-2 text-sm text-muted">
        <LockIcon className="shrink-0 text-accent" />
        {t("analyze.status.onDevice")}
      </p>
    </div>
  );
}
