"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import {
  CONFIDENCE_FILL_DELAY_S,
  CONFIDENCE_FILL_S,
  REVEAL_EASE,
} from "@/components/motion/config";

/**
 * The confidence as a gold line with a small diamond at its end (decorative: the percentage is
 * visible text next to it). It fills from 0 when the results appear; with
 * `prefers-reduced-motion: reduce` it is drawn at its value straight away. Inside <MotionRoot>.
 */
export function ConfidenceBar({ percent, appear = true }: { percent: number; appear?: boolean }) {
  const reduced = useReducedMotion();
  const animate = appear && !reduced;
  return (
    <div aria-hidden="true" className="relative mt-3 h-0.5 bg-line" data-percent={percent}>
      <m.div
        className="absolute inset-y-0 left-0 bg-accent"
        initial={animate ? { width: "0%" } : false}
        animate={{ width: `${percent}%` }}
        transition={{
          duration: CONFIDENCE_FILL_S,
          delay: CONFIDENCE_FILL_DELAY_S,
          ease: REVEAL_EASE,
        }}
      >
        <span className="absolute top-1/2 -right-1 size-2 -translate-y-1/2 rotate-45 bg-accent" />
      </m.div>
    </div>
  );
}
