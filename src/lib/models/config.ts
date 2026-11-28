/**
 * Self-hosted MediaPipe files (SPEC §4, §17). `pnpm models:fetch` writes them to
 * public/models/<version>/, and the worker loads them from the same versioned URL.
 */

/** URL prefix of everything `models:fetch` writes (public/models/ on disk). */
export const MODELS_URL_PREFIX = "/models";

/**
 * How many hex characters of the model's SHA-256 go into the version folder name. Eight
 * (32 bits) is plenty to tell our own model versions apart; the full hash is checked by
 * models:fetch.
 */
export const MODEL_HASH_PREFIX_LENGTH = 8;

/**
 * Cache lifetime for /models/* responses, in seconds (one year, the usual maximum). Safe because
 * the folder name changes whenever a file changes, and the response is marked `immutable`.
 */
export const MODELS_CACHE_MAX_AGE_S = 31_536_000;

/**
 * Approximate one-time download, in MB, shown to the user while the model loads. Measured
 * 2026-11-28 for tasks-vision 1.2.3 with gzip (as `next start` serves it): WASM 4.15 MB + model
 * 3.33 MB + loader 0.08 MB ≈ 7.6 MB (19 MB uncompressed). Update when the model changes.
 */
export const MODEL_DOWNLOAD_MB = 8;
