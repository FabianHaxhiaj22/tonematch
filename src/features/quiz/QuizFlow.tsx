"use client";

/**
 * The 4-question undertone quiz (SPEC §6.6). One question per screen, native radio buttons
 * (keyboard and screen-reader support for free), large tap targets, no animation beyond colour
 * transitions (and none at all with prefers-reduced-motion). Strings come from the en/sq
 * message files; until M8 adds locale routing, the language is switched here.
 */
import { useEffect, useRef } from "react";
import { LOCALES, translator, type MessageKey } from "@/i18n/messages";
import {
  QUIZ_ANSWERS,
  QUIZ_QUESTIONS,
  type QuizAnswer,
  type QuizQuestion,
} from "@/lib/analysis/undertone";
import { SUMMARY_STEP, useQuizStore } from "@/store/quiz";

const answerKey = (q: QuizQuestion, a: QuizAnswer) => `quiz.questions.${q}.${a}` as MessageKey;
const promptKey = (q: QuizQuestion) => `quiz.questions.${q}.prompt` as MessageKey;

const buttonClass =
  "min-h-12 rounded-lg border-2 border-current px-5 py-2 font-medium " +
  "focus-visible:outline-3 focus-visible:outline-offset-2 disabled:opacity-40";

export function QuizFlow() {
  const { answers, step, locale, answer, goTo, setLocale, reset } = useQuizStore();
  const t = translator(locale);
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
    <main lang={locale} className="mx-auto w-full max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold sm:text-3xl">{t("quiz.title")}</h1>
        <div role="group" aria-label={t("common.language")} className="flex gap-1">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              aria-pressed={locale === l}
              onClick={() => setLocale(l)}
              className="min-h-11 rounded-md px-3 text-sm font-medium underline-offset-4 focus-visible:outline-3 aria-pressed:underline"
            >
              {t(`common.languageNames.${l}` as MessageKey)}
            </button>
          ))}
        </div>
      </div>

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
            className="text-xl font-semibold focus:outline-none"
          >
            {t("quiz.summary.title")}
          </h2>
          <ol className="mt-4 space-y-4">
            {QUIZ_QUESTIONS.map((q, i) => {
              const a = answers[q];
              return (
                <li key={q} className="rounded-lg border p-4">
                  <p className="text-sm opacity-80">{t(promptKey(q))}</p>
                  <p className="mt-1 font-medium">
                    {a && a !== "unsure" ? t(answerKey(q, a)) : t("quiz.summary.skipped")}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={t("quiz.summary.changeQuestion", { number: i + 1 })}
                    className="mt-2 min-h-11 text-sm font-medium underline underline-offset-4 focus-visible:outline-3"
                  >
                    {t("quiz.summary.change")}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-6">{t("quiz.summary.later")}</p>
          <button type="button" onClick={reset} className={`${buttonClass} mt-6`}>
            {t("quiz.summary.restart")}
          </button>
        </section>
      )}

      <p className="mt-10 text-sm opacity-80">{t("quiz.privacy")}</p>
    </main>
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
      {step === 0 && <p className="mb-6">{t("quiz.intro")}</p>}
      <fieldset>
        <legend
          ref={headingRef as React.Ref<HTMLLegendElement>}
          tabIndex={-1}
          className="focus:outline-none"
        >
          <span className="block text-sm font-medium opacity-80">
            {t("quiz.progress", { current: step + 1, total: QUIZ_QUESTIONS.length })}
          </span>
          <span className="mt-1 block text-lg font-semibold sm:text-xl">{t(promptKey(q))}</span>
        </legend>
        <div className="mt-4 grid gap-3">
          {QUIZ_ANSWERS.map((a) => (
            <label
              key={a}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border-2 border-current/30 px-4 py-3 motion-safe:transition-colors has-checked:border-current has-checked:font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2"
            >
              <input
                type="radio"
                name={q}
                value={a}
                checked={selected === a}
                onChange={() => onSelect(a)}
                className="size-5 shrink-0 accent-current"
              />
              <span>{t(answerKey(q, a))}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 flex justify-between gap-4">
        <button type="button" onClick={onBack} disabled={step === 0} className={buttonClass}>
          {t("quiz.back")}
        </button>
        <button type="submit" disabled={!selected} className={buttonClass}>
          {last ? t("quiz.finish") : t("quiz.next")}
        </button>
      </div>
    </form>
  );
}
