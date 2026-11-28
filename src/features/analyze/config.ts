/**
 * Timing for the analysis step on /analyze (M6b-1). Named, commented constants only (rule 8).
 */

/**
 * After this long in the `loading-model` stage, add a note that the first download can take a
 * while on a slow connection. ~8 MB arrives in about 3 s at 20 Mbit/s but 40 s at 1.6 Mbit/s
 * (a weak 4G/3G signal), so 8 s separates "normal" from "slow" without nagging fast connections.
 */
export const SLOW_LOAD_MS = 8_000;

/**
 * Give up on one analysis after this long and offer "Try again". Generous because the first
 * visit downloads ~8 MB: at 0.5 Mbit/s that alone takes ~130 s. Detection itself takes well
 * under a second once loaded.
 */
export const ANALYSIS_TIMEOUT_MS = 180_000;

/** Dev-only `detect` requests (/dev/landmarks) time out after this long. */
export const DETECT_TIMEOUT_MS = 60_000;
