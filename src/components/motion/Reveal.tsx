"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";
import { REVEAL_DURATION_S, REVEAL_EASE, REVEAL_RISE_PX, REVEAL_STAGGER_S } from "./config";

/**
 * Fades its content in with a gentle rise (DESIGN.md "Motion"). Must sit inside <MotionRoot>.
 * - `appear={false}` renders the final state straight away: use it for the first paint (server
 *   HTML must never start invisible) and animate only what appears later.
 * - With `prefers-reduced-motion: reduce` nothing animates, not even the fade.
 * - `index` staggers items revealed together (`stagger` seconds apart; list items by default).
 */
export function Reveal({
  children,
  appear = true,
  index = 0,
  stagger = REVEAL_STAGGER_S,
  className,
}: {
  children: ReactNode;
  appear?: boolean;
  index?: number;
  stagger?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const animate = appear && !reduced;
  return (
    <m.div
      className={className}
      initial={animate ? { opacity: 0, y: REVEAL_RISE_PX } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: REVEAL_DURATION_S,
        ease: REVEAL_EASE,
        delay: index * stagger,
      }}
    >
      {children}
    </m.div>
  );
}
