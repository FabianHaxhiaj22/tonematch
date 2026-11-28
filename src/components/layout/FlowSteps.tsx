"use client";

import Link from "next/link";
import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";
import { CONTAINER } from "./container";

/** The flow's steps, in order (SPEC §13: a progress indicator across steps). */
export const FLOW_STEPS = [
  { id: "photo", href: "/analyze", labelKey: "flow.steps.photo" },
  { id: "questions", href: "/quiz", labelKey: "flow.steps.questions" },
  { id: "result", href: "/results", labelKey: "flow.steps.result" },
] as const satisfies readonly { id: string; href: string; labelKey: MessageKey }[];

export type FlowStep = (typeof FLOW_STEPS)[number]["id"];

/**
 * Step indicator under the header on /analyze, /quiz and /results: Photo · Questions · Result.
 * The current step is marked with `aria-current="step"` and a gold underline; earlier steps are
 * links back (SPEC §13: every step can be revisited); later steps are plain text. On phones only
 * the current step shows its name; the others show their number, with the name kept for screen
 * readers.
 */
export function FlowSteps({ current }: { current: FlowStep }) {
  const t = useT();
  const currentIndex = FLOW_STEPS.findIndex((s) => s.id === current);
  return (
    <nav aria-label={t("flow.steps.label")} className={CONTAINER}>
      <ol className="flex border-b border-line">
        {FLOW_STEPS.map((step, i) => {
          const isCurrent = i === currentIndex;
          const content = (
            <>
              {/* The space keeps "1. Photo" apart for screen readers (flex drops it visually). */}
              {i + 1}.{" "}
              <span className={isCurrent ? "ml-1.5" : "sr-only sm:not-sr-only sm:ml-1.5"}>
                {t(step.labelKey)}
              </span>
            </>
          );
          const cell =
            "eyebrow flex min-h-11 items-center justify-center px-3 py-3 whitespace-nowrap";
          return (
            <li key={step.id} className={isCurrent ? "flex-1" : "flex-none sm:flex-1"}>
              {isCurrent ? (
                <span
                  aria-current="step"
                  className={`${cell} -mb-px border-b-2 border-accent text-ink`}
                >
                  {content}
                </span>
              ) : i < currentIndex ? (
                <Link
                  href={step.href}
                  className={`${cell} text-muted underline-offset-4 hover:text-ink hover:underline`}
                >
                  {content}
                </Link>
              ) : (
                <span className={`${cell} text-muted`}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
