/**
 * Versioned URLs of the self-hosted MediaPipe files. The version folder is derived from
 * scripts/models.lock.json (tasks-vision version + model hash), so upgrading either one changes
 * every URL, and the long `immutable` caching of /models/* (next.config.ts) can never serve a
 * stale file.
 */
import lock from "../../../scripts/models.lock.json";
import { MODEL_HASH_PREFIX_LENGTH, MODELS_URL_PREFIX } from "./config";

/** The parts of models.lock.json that identify a set of model files. */
export type ModelsLockId = { tasksVisionVersion: string; model: { file: string; sha256: string } };

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** Folder name for a lock, e.g. "1.2.3-64184e22". Throws on a malformed lock. */
export function modelsVersion(l: ModelsLockId): string {
  if (!VERSION_PATTERN.test(l.tasksVisionVersion)) {
    throw new Error(`models.lock.json: bad tasksVisionVersion "${l.tasksVisionVersion}"`);
  }
  if (!SHA256_PATTERN.test(l.model.sha256)) {
    throw new Error("models.lock.json: model.sha256 must be 64 lowercase hex characters");
  }
  return `${l.tasksVisionVersion}-${l.model.sha256.slice(0, MODEL_HASH_PREFIX_LENGTH)}`;
}

/** URLs for a lock (the app uses the current lock: MODEL_PATHS below). */
export function modelPaths(l: ModelsLockId) {
  const base = `${MODELS_URL_PREFIX}/${modelsVersion(l)}`;
  return {
    version: modelsVersion(l),
    base,
    wasm: `${base}/wasm`,
    model: `${base}/${l.model.file}`,
  };
}

export const MODEL_PATHS = modelPaths(lock);
