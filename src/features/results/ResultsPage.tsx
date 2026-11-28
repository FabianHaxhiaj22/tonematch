"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { CONTAINER_NARROW } from "@/components/layout/container";
import { FlowSteps } from "@/components/layout/FlowSteps";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { buildResultsView } from "@/lib/results";
import { selectSummary, useAnalysisStore } from "@/store/analysis";
import { useFlowStore } from "@/store/flow";
import { useQuizStore } from "@/store/quiz";
import { RECOMMEND_DATA } from "./config";
import { ResultsView } from "./ResultsView";
import { StartWithPhoto } from "./StartWithPhoto";

/**
 * /results (M6b-2). Built in the browser from what this tab holds: the numbers kept from the
 * photo analysis and the quiz answers (both memory only). Without an analysis (a reload, or
 * arriving here directly) it asks the user to start with a photo. Changing an answer and coming
 * back recomputes the results.
 */
export function ResultsPage() {
  const router = useRouter();
  const summary = useAnalysisStore(selectSummary);
  const answers = useQuizStore((s) => s.answers);
  const startOver = useFlowStore((s) => s.startOver);
  const view = useMemo(
    () => (summary ? buildResultsView(summary, answers, RECOMMEND_DATA) : null),
    [summary, answers],
  );

  function startAgain() {
    startOver();
    router.push("/analyze");
  }

  return (
    <>
      <FlowSteps current="result" />
      {view ? (
        <MotionRoot>
          <ResultsView view={view} onStartAgain={startAgain} />
        </MotionRoot>
      ) : (
        <div className={`${CONTAINER_NARROW} py-12 md:py-20`}>
          <StartWithPhoto variant="page" />
        </div>
      )}
    </>
  );
}
