"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONTAINER_NARROW } from "@/components/layout/container";
import { FlowSteps } from "@/components/layout/FlowSteps";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { Reveal } from "@/components/motion/Reveal";
import { BUTTON_PRIMARY, BUTTON_TEXT } from "@/components/ui/buttons";
import { PhotoPicker } from "@/features/photo/PhotoPicker";
import { PhotoTips } from "@/features/photo/PhotoTips";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import { useAnalysisStore, type AnalysisPhase } from "@/store/analysis";
import { useFlowStore, type FlowPhoto } from "@/store/flow";
import { AnalysisStatus } from "./AnalysisStatus";
import { BlockedReport, DoneReport, WarningsReport } from "./QualityReport";
import { retryAnalysis, runAnalysis } from "./runAnalysis";

/** What /analyze shows, from the photo (if still held) and the analysis phase. */
type View =
  | { name: "pick" }
  | { name: "analysing"; photo: FlowPhoto; phase: AnalysisPhase }
  | { name: "loadFailed" }
  | { name: "decodeFailed" }
  | { name: "blocked"; phase: Extract<AnalysisPhase, { status: "blocked" }> }
  | { name: "review"; phase: Extract<AnalysisPhase, { status: "review" }> }
  | { name: "done"; phase: Extract<AnalysisPhase, { status: "done" }> };

function viewFor(photo: FlowPhoto | null, phase: AnalysisPhase): View {
  switch (phase.status) {
    case "blocked":
      return { name: "blocked", phase };
    case "review":
      return { name: "review", phase };
    case "done":
      return { name: "done", phase };
    case "failed":
      return { name: phase.reason === "decode" || !photo ? "decodeFailed" : "loadFailed" };
    default:
      return photo ? { name: "analysing", photo, phase } : { name: "pick" };
  }
}

const TITLES: Record<View["name"], MessageKey> = {
  pick: "analyze.emptyTitle",
  analysing: "analyze.title",
  loadFailed: "analyze.failed.loadTitle",
  decodeFailed: "analyze.failed.decodeTitle",
  blocked: "analyze.report.blockedTitle",
  review: "analyze.report.reviewTitle",
  done: "analyze.done.title",
};

/**
 * /analyze, the photo step (M6b-1). With a photo it runs the analysis in the worker (status
 * messages), then shows the quality report: blocking issues → "Choose another photo"; warnings →
 * "Analyse anyway" or another photo; passed → on to the questions. The photo is released as soon
 * as it's analysed, so coming back here says it was analysed and removed. Without a photo or a
 * result it shows the picker.
 */
export function PhotoStep() {
  const t = useT();
  const router = useRouter();
  const photo = useFlowStore((s) => s.photo);
  const chooseAnother = useFlowStore((s) => s.chooseAnother);
  const phase = useAnalysisStore((s) => s.phase);
  const acceptWarnings = useAnalysisStore((s) => s.acceptWarnings);
  const view = viewFor(photo, phase);

  // Start analysing a newly chosen photo (runAnalysis ignores repeats while one is running).
  useEffect(() => {
    if (photo && phase.status === "idle") void runAnalysis(photo);
  }, [photo, phase.status]);

  // When the view changes, move focus to its heading; animate only views that appear later
  // (the first paint, server-rendered, must never start invisible).
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [initialView] = useState(view.name);
  const appear = view.name !== initialView;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [view.name]);

  function analyseAnyway() {
    acceptWarnings();
    router.push("/quiz");
  }

  return (
    <MotionRoot>
      <FlowSteps current="photo" />
      <div
        className={`${CONTAINER_NARROW} py-12 md:py-20`}
        // The size the worker analysed (after EXIF orientation and downscaling), for e2e tests:
        // a sideways photo is still detected, so only the size shows orientation was applied.
        data-analysed-size={
          "size" in phase ? `${phase.size.width}x${phase.size.height}` : undefined
        }
      >
        <p className="eyebrow text-accent">{t("analyze.eyebrow")}</p>
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="mt-3 mb-8 font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-normal focus:outline-none"
        >
          {t(TITLES[view.name])}
        </h1>

        <Reveal key={view.name} appear={appear}>
          {view.name === "pick" && (
            <>
              <PhotoPicker />
              <PhotoTips className="mt-3" />
            </>
          )}

          {view.name === "analysing" && (
            <>
              {/* A blob: URL of the user's own file; next/image can't optimise it and needn't. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={view.photo.url}
                alt={t("analyze.previewAlt")}
                className="max-h-[50vh] w-auto max-w-full border border-line bg-surface object-contain p-2"
              />
              {view.phase.status === "running" ? (
                <AnalysisStatus stage={view.phase.stage} slow={view.phase.slow} />
              ) : (
                <AnalysisStatus stage="preparing" slow={false} />
              )}
            </>
          )}

          {view.name === "loadFailed" && (
            <>
              <p className="border-l-2 border-accent pl-4 text-lg">{t("analyze.failed.load")}</p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <button type="button" onClick={retryAnalysis} className={BUTTON_PRIMARY}>
                  {t("analyze.failed.retry")}
                </button>
                <button type="button" onClick={chooseAnother} className={BUTTON_TEXT}>
                  {t("analyze.another")}
                </button>
              </div>
            </>
          )}

          {view.name === "decodeFailed" && (
            <>
              <p className="border-l-2 border-accent pl-4 text-lg">{t("analyze.failed.decode")}</p>
              <div className="mt-8">
                <button type="button" onClick={chooseAnother} className={BUTTON_PRIMARY}>
                  {t("analyze.another")}
                </button>
              </div>
            </>
          )}

          {view.name === "blocked" && (
            <>
              <BlockedReport reason={view.phase.reason} onChooseAnother={chooseAnother} />
              <PhotoTips className="mt-10" />
            </>
          )}

          {view.name === "review" && (
            <WarningsReport
              warnings={view.phase.warnings}
              onAnalyseAnyway={analyseAnyway}
              onChooseAnother={chooseAnother}
            />
          )}

          {view.name === "done" && (
            <>
              <DoneReport accepted={view.phase.warnings.length > 0} />
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                <Link href="/quiz" className={BUTTON_PRIMARY}>
                  {t("analyze.next")}
                </Link>
                <button type="button" onClick={chooseAnother} className={BUTTON_TEXT}>
                  {t("analyze.another")}
                </button>
              </div>
            </>
          )}
        </Reveal>
      </div>
    </MotionRoot>
  );
}
