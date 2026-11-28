"use client";

/**
 * The 4-question undertone quiz (SPEC §6.6), in the Atelier style (D-034) since M6b-2. One
 * question per screen, native radio buttons (keyboard and screen-reader support for free), large
 * tap targets, colour transitions only (none with prefers-reduced-motion). Strings come from the
 * en/sq message files; the language comes from the header switch (src/store/locale.ts) until M8.
 * The summary leads to the results, or to the photo step when there's no analysis yet.
 */
import Link from "next/link";
import { useEffect, useRef } from "react";
import { CONTAINER_NARROW } from "@/components/layout/container";
import { FlowSteps } from "@/components/layout/FlowSteps";
import { BUTTON_OUTLINE, BUTTON_PRIMARY, BUTTON_TEXT } from "@/components/ui/buttons";
import { StartWithPhoto } from "@/features/results/StartWithPhoto";
import { translator, type MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import {
  QUIZ_ANSWERS,
  QUIZ_QUESTIONS,
  type QuizAnswer,
  type QuizQuestion,
} from "@/lib/analysis/undertone";
import { selectSummary, useAnalysisStore } from "@/store/analysis";
import { useFlowStore } from "@/store/flow";
import { SUMMARY_STEP, useQuizStore } from "@/store/quiz";

const answerKey = (q: QuizQuestion, a: QuizAnswer) => `quiz.questions.${q}.${a}` as MessageKey;
const promptKey = (q: QuizQuestion) => `quiz.questions.${q}.prompt` as MessageKey;

/** Back/Next: the standard button shapes, dimmed while disabled. */
const DISABLED = "disabled:cursor-not-allowed disabled:opacity-40";

export function QuizFlow() {
  const { answers, step, answer, goTo } = useQuizStore();
  const startOver = useFlowStore((s) => s.startOver);
  const hasAnalysis = useAnalysisStore((s) => selectSummary(s) !== null);
  const t = useT();
  const headingRef = useRef<HTMLHeadingElement | HTMLLegendElement | null>(null);
  const firstRender = useRef(true);

  // Move focus to the new question (or the summary) so screen readers announce it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  return (
    <>
      <FlowSteps current="questions" />
      <div className={`${CONTAINER_NARROW} py-12 md:py-20`}>
        <p className="eyebrow text-accent">{t("quiz.eyebrow")}</p>
        <h1 className="mt-3 mb-8 font-display text-[clamp(2.5rem,6vw,4rem)] leading-none font-normal">
          {t("quiz.title")}
        </h1>

        {step < SUMMARY_STEP ? (
          <Question
            key={QUIZ_QUESTIONS[step]}
            step={step}
            headingRef={headingRef}
            t={t}
            selected={answers[QUIZ_QUESTIONS[step]!]}
            onSelect={(a) => answer(QUIZ_QUESTIONS[step]!, a)}
            onBack={() => goTo(step - 1)}
            onNext={() => goTo(step + 1)}
          />
        ) : (
          <section aria-labelledby="quiz-summary">
            <h2
              id="quiz-summary"
              ref={headingRef as React.Ref<HTMLHeadingElement>}
              tabIndex={-1}
              className="font-display text-[1.75rem] font-medium focus:outline-none"
            >
              {t("quiz.summary.title")}
            </h2>
            <ol className="mt-4 border-t border-line">
              {QUIZ_QUESTIONS.map((q, i) => {
                const a = answers[q];
                return (
                  <li
                    key={q}
                    className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line py-4"
                  >
                    <div className="min-w-0 flex-1 basis-60">
                      <p className="text-sm text-muted">{t(promptKey(q))}</p>
                      <p className="mt-1 font-medium">
                        {a && a !== "unsure" ? t(answerKey(q, a)) : t("quiz.summary.skipped")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => goTo(i)}
                      aria-label={t("quiz.summary.changeQuestion", { number: i + 1 })}
                      className={BUTTON_TEXT}
                    >
                      {t("quiz.summary.change")}
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-muted">{t("quiz.summary.later")}</p>
            <div className="mt-8">
              {hasAnalysis ? (
                <Link href="/results" className={BUTTON_PRIMARY}>
                  {t("quiz.summary.seeResults")}
                </Link>
              ) : (
                <StartWithPhoto variant="inline" />
              )}
            </div>
            <button type="button" onClick={startOver} className={`${BUTTON_TEXT} mt-6`}>
              {t("quiz.summary.restart")}
            </button>
          </section>
        )}

        <p className="mt-12 text-[0.8125rem] text-muted">{t("quiz.privacy")}</p>
      </div>
    </>
  );
}

function Question({
  step,
  headingRef,
  t,
  selected,
  onSelect,
  onBack,
  onNext,
}: {
  step: number;
  headingRef: React.RefObject<HTMLHeadingElement | HTMLLegendElement | null>;
  t: ReturnType<typeof translator>;
  selected: QuizAnswer | undefined;
  onSelect: (a: QuizAnswer) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const q = QUIZ_QUESTIONS[step]!;
  const last = step === QUIZ_QUESTIONS.length - 1;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (selected) onNext();
      }}
    >
      {step === 0 && <p className="mb-8 text-lg text-muted">{t("quiz.intro")}</p>}
      <fieldset>
        <legend
          ref={headingRef as React.Ref<HTMLLegendElement>}
          tabIndex={-1}
          className="focus:outline-none"
        >
          <span className="eyebrow block text-accent">
            {t("quiz.progress", { current: step + 1, total: QUIZ_QUESTIONS.length })}
          </span>
          <span className="mt-2 block font-display text-[1.75rem] leading-tight font-medium">
            {t(promptKey(q))}
          </span>
        </legend>
        <div className="mt-6 grid gap-3">
          {QUIZ_ANSWERS.map((a) => (
            <label
              key={a}
              className="flex min-h-14 cursor-pointer items-center gap-4 border border-line bg-surface px-5 py-3 motion-safe:transition-colors hover:border-muted has-checked:border-accent has-checked:font-medium has-focus-visible:outline-2 has-focus-visible:outline-offset-3 has-focus-visible:outline-focus"
            >
              <input
                type="radio"
                name={q}
                value={a}
                checked={selected === a}
                onChange={() => onSelect(a)}
                className="size-5 shrink-0 accent-accent focus-visible:outline-none"
              />
              <span>{t(answerKey(q, a))}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-8 flex justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 0}
          className={`${BUTTON_OUTLINE} ${DISABLED}`}
        >
          {t("quiz.back")}
        </button>
        <button type="submit" disabled={!selected} className={`${BUTTON_PRIMARY} ${DISABLED}`}>
          {last ? t("quiz.finish") : t("quiz.next")}
        </button>
      </div>
    </form>
  );
}
