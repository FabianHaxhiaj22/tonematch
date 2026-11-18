"use client";

/**
 * Dev-only scoring view (M4): depth, MST (approximate), undertone, both confidences and the
 * region weights for the current photo, with quiz answers from the shared quiz store (fill them
 * in here or on /quiz in the same tab). English-only, like the rest of /dev/landmarks.
 */
import type { QualityResult } from "@/lib/analysis/quality";
import type { SkinSample } from "@/lib/analysis/sampler";
import { scoreAnalysis } from "@/lib/analysis/score";
import { QUIZ_ANSWERS, QUIZ_QUESTIONS, type QuizAnswer } from "@/lib/analysis/undertone";
import { useQuizStore } from "@/store/quiz";

const fmt = (v: number) => v.toFixed(2);
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function ScorePanel({ sample, quality }: { sample: SkinSample; quality: QualityResult }) {
  const answers = useQuizStore((s) => s.answers);
  const answer = useQuizStore((s) => s.answer);
  const r = scoreAnalysis(sample, quality, answers);

  return (
    <div>
      <h2 className="font-semibold">Scoring{sample.calibrated ? " (calibrated sample)" : ""}</h2>
      <fieldset className="mt-1 flex flex-wrap gap-3 text-xs">
        <legend className="sr-only">Quiz answers</legend>
        {QUIZ_QUESTIONS.map((q) => (
          <label key={q}>
            {q}{" "}
            <select
              value={answers[q] ?? ""}
              onChange={(e) => answer(q, e.target.value as QuizAnswer)}
              className="rounded border px-1"
            >
              <option value="">(none)</option>
              {QUIZ_ANSWERS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      {r === null ? (
        <p className="mt-1">No usable skin colour (no region had enough pixels).</p>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-xs" data-testid="score">
          <li>
            Depth: {r.depth.label}, MST ≈ {r.depth.mstApprox} (approximate), depth angle{" "}
            {r.depth.angle.toFixed(1)}° ({r.depth.method}; ITA{" "}
            {r.depth.ita === null ? "n/a" : r.depth.ita.toFixed(1) + "°"})
          </li>
          <li>
            Undertone: <strong>{r.undertone.label}</strong> (s = {fmt(r.undertone.score)}; photo p ={" "}
            {fmt(r.undertone.photoScore)}, quiz q ={" "}
            {r.undertone.quizScore === null ? "n/a" : fmt(r.undertone.quizScore)} from{" "}
            {r.undertone.answeredCount}/4, quiz consistency {fmt(r.undertone.quizConsistency)};
            photo weight {fmt(r.undertone.photoWeight)}; pull to neutral ×
            {fmt(r.undertone.splitShrink)})
          </li>
          <li>
            Photo confidence {pct(r.photoConfidence.value)}
            {r.photoConfidence.factors.length > 0 &&
              ` = ${r.photoConfidence.factors.map((f) => `${f.reason} ×${fmt(f.factor)}`).join(", ")}`}
          </li>
          <li>
            Overall confidence {pct(r.confidence)}
            {r.notes.length > 0 && ` · notes: ${r.notes.join(", ")}`}
          </li>
          <li>
            Region weights: R {fmt(sample.weights.rightCheek)} / L {fmt(sample.weights.leftCheek)} /
            F {fmt(sample.weights.forehead)}
            {sample.weightReasons.length > 0 &&
              ` (forehead up: ${sample.weightReasons.join(", ")})`}
          </li>
        </ul>
      )}
    </div>
  );
}
