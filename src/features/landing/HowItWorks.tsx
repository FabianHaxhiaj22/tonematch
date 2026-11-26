"use client";

import type { MessageKey } from "@/i18n/messages";
import { useT } from "@/i18n/useT";

const STEPS = ["photo", "quiz", "palette"] as const;
/** Roman numerals are decoration; the ordered list carries the order for assistive tech. */
const NUMERALS = ["I", "II", "III"] as const;

export function HowItWorks() {
  const t = useT();
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-title"
      className="scroll-mt-6 border-t border-line py-16 md:py-20"
    >
      <p className="eyebrow text-accent">{t("landing.how.eyebrow")}</p>
      <h2
        id="how-title"
        className="mt-2 font-display text-[clamp(2rem,4vw,3rem)] leading-tight font-normal"
      >
        {t("landing.how.title")}
      </h2>
      <ol className="mt-10 grid md:grid-cols-3">
        {STEPS.map((step, i) => (
          <li
            key={step}
            className="border-t border-line py-7 md:border-t-0 md:py-2 md:pr-8 md:not-first:border-l md:not-first:pl-8"
          >
            <span
              aria-hidden="true"
              className="font-display text-[2.75rem] leading-none text-accent italic"
            >
              {NUMERALS[i]}
            </span>
            <h3 className="mt-3 mb-2 font-display text-[1.625rem] font-medium">
              {t(`landing.how.steps.${step}.title` as MessageKey)}
            </h3>
            <p className="text-[0.9375rem] text-muted">
              {t(`landing.how.steps.${step}.body` as MessageKey)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
