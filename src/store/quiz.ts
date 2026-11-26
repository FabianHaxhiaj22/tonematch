/**
 * Quiz state (SPEC §4: Zustand for the analysis flow). In memory only: nothing is written to
 * storage or sent anywhere. Answers are reset when the tab closes or on "Start again"
 * (`startOver` in ./flow). The language lives in ./locale.
 */
import { create } from "zustand";
import {
  QUIZ_QUESTIONS,
  type QuizAnswer,
  type QuizAnswers,
  type QuizQuestion,
} from "@/lib/analysis/undertone";

/** Steps 0–3 are the questions; step 4 (= QUIZ_QUESTIONS.length) is the summary. */
export const SUMMARY_STEP = QUIZ_QUESTIONS.length;

type QuizState = {
  answers: QuizAnswers;
  step: number;
  answer: (question: QuizQuestion, value: QuizAnswer) => void;
  goTo: (step: number) => void;
  reset: () => void;
};

export const useQuizStore = create<QuizState>()((set) => ({
  answers: {},
  step: 0,
  answer: (question, value) => set((s) => ({ answers: { ...s.answers, [question]: value } })),
  goTo: (step) => set({ step: Math.max(0, Math.min(SUMMARY_STEP, step)) }),
  reset: () => set({ answers: {}, step: 0 }),
}));
