/**
 * Motion tokens (DESIGN.md "Motion"): fades and gentle rise-ins only, short and calm. Under
 * `prefers-reduced-motion: reduce` nothing animates at all (see Reveal.tsx).
 */

/** Length of a fade / rise-in, in seconds. */
export const REVEAL_DURATION_S = 0.45;

/** How far content rises while it fades in, in px. Small enough to read as "settling", not moving. */
export const REVEAL_RISE_PX = 8;

/** Delay between items revealed one after another (e.g. a list), in seconds. */
export const REVEAL_STAGGER_S = 0.07;

/** Ease-out curve (fast start, soft landing): cubic-bezier(0.22, 1, 0.36, 1). */
export const REVEAL_EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Results page (M6b-2): its sections appear one after another, a little further apart than items
 * in a list so the sequence reads as profile → summary → metals → styles → gemstones.
 */
export const SECTION_STAGGER_S = 0.12;

/** The confidence bar fills from 0 to the value, after the profile has settled in. */
export const CONFIDENCE_FILL_S = 0.9;
export const CONFIDENCE_FILL_DELAY_S = 0.3;
