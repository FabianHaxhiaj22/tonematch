"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./features").then((mod) => mod.default);

/**
 * Wrap animated UI in this. Features load lazily (`strict`: only the light `m` components are
 * allowed inside, never the full `motion` ones). `reducedMotion="user"` is Motion's own safety
 * net for the reduced-motion setting; Reveal additionally skips animation entirely.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
