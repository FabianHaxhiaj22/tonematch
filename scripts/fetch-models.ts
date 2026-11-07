/**
 * models:fetch — fills public/models/ with the MediaPipe files the app self-hosts (README §4, §17).
 *
 * 1. Copies the WASM runtime from the installed, pinned @mediapipe/tasks-vision package
 *    (node_modules/@mediapipe/tasks-vision/wasm) into public/models/wasm/.
 * 2. Downloads ONLY face_landmarker.task from a pinned, versioned URL into public/models/.
 * 3. Verifies SHA-256 checksums against scripts/models.lock.json.
 *
 * Skips work when files already match. public/models/ is gitignored.
 *
 * Usage:
 *   pnpm models:fetch             verify/fill (fails on any checksum mismatch)
 *   pnpm models:fetch --update    re-record checksums in models.lock.json (deliberate bumps only).
 *                                 The model download is cross-checked against the MD5 that
 *                                 Google Cloud Storage reports in its x-goog-hash header.
 */
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type Lock = {
  tasksVisionVersion: string;
  model: { file: string; url: string; bytes: number; sha256: string };
  wasm: Record<string, string>; // filename -> sha256
};

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const LOCK_PATH = join(ROOT, "scripts", "models.lock.json");
const OUT_DIR = join(ROOT, "public", "models");
const WASM_OUT_DIR = join(OUT_DIR, "wasm");
const DOWNLOAD_TIMEOUT_MS = 120_000;

const update = process.argv.includes("--update");

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

function fileSha256(path: string): string | null {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

function fail(message: string): never {
  console.error(`models:fetch ✗ ${message}`);
  process.exit(1);
}

function readLock(): Lock {
  return JSON.parse(readFileSync(LOCK_PATH, "utf8")) as Lock;
}

function tasksVisionDir(): { dir: string; version: string } {
  // The package's "exports" map doesn't expose package.json, so resolve the main entry
  // (vision_bundle.cjs, at the package root) and read package.json next to it.
  const require = createRequire(import.meta.url);
  const dir = dirname(require.resolve("@mediapipe/tasks-vision", { paths: [ROOT] }));
  const { name, version } = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as {
    name: string;
    version: string;
  };
  if (name !== "@mediapipe/tasks-vision") fail(`unexpected package at ${dir}`);
  return { dir, version };
}

function syncWasm(lock: Lock): void {
  const { dir, version } = tasksVisionDir();
  if (!update && version !== lock.tasksVisionVersion) {
    fail(
      `@mediapipe/tasks-vision is ${version} but models.lock.json expects ${lock.tasksVisionVersion}. ` +
        "After a deliberate upgrade, run `pnpm models:fetch --update` and commit the lock file.",
    );
  }
  const srcDir = join(dir, "wasm");
  const files = readdirSync(srcDir).filter((f) => f.endsWith(".js") || f.endsWith(".wasm"));
  mkdirSync(WASM_OUT_DIR, { recursive: true });

  const recorded: Record<string, string> = {};
  for (const file of files) {
    const srcHash = fileSha256(join(srcDir, file));
    if (!srcHash) fail(`missing ${file} in ${srcDir}`);
    if (!update && lock.wasm[file] !== srcHash) {
      fail(`checksum mismatch for wasm/${file} (installed package differs from models.lock.json)`);
    }
    const dest = join(WASM_OUT_DIR, file);
    if (fileSha256(dest) !== srcHash) copyFileSync(join(srcDir, file), dest);
    recorded[file] = srcHash;
  }
  if (!update) {
    const missing = Object.keys(lock.wasm).filter((f) => !files.includes(f));
    if (missing.length) fail(`wasm files listed in lock but not in package: ${missing.join(", ")}`);
  }
  lock.tasksVisionVersion = version;
  lock.wasm = recorded;
  console.log(`models:fetch ✓ wasm (${files.length} files, tasks-vision ${version})`);
}

async function syncModel(lock: Lock): Promise<void> {
  const dest = join(OUT_DIR, lock.model.file);
  if (!update && fileSha256(dest) === lock.model.sha256) {
    console.log(`models:fetch ✓ ${lock.model.file} (already present)`);
    return;
  }

  const res = await fetch(lock.model.url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) });
  if (!res.ok) fail(`download failed: HTTP ${res.status} for ${lock.model.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = sha256(buf);

  if (update) {
    // Cross-check against the MD5 that Google Cloud Storage reports for the object.
    const goog = res.headers.get("x-goog-hash") ?? "";
    const md5 = /md5=([^,]+)/.exec(goog)?.[1];
    if (!md5) fail("no MD5 in x-goog-hash header; cannot cross-check the download");
    const actualMd5 = createHash("md5").update(buf).digest("base64");
    if (actualMd5 !== md5) fail(`MD5 mismatch vs storage header (${actualMd5} != ${md5})`);
    lock.model.sha256 = hash;
    lock.model.bytes = buf.length;
  } else if (hash !== lock.model.sha256) {
    fail(`checksum mismatch for ${lock.model.file}: got ${hash}, expected ${lock.model.sha256}`);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const tmp = `${dest}.download`;
  writeFileSync(tmp, buf);
  renameSync(tmp, dest);
  console.log(`models:fetch ✓ ${lock.model.file} (${buf.length} bytes, downloaded)`);
}

async function main(): Promise<void> {
  const lock = readLock();
  syncWasm(lock);
  await syncModel(lock);
  if (update) {
    writeFileSync(LOCK_PATH, `${JSON.stringify(lock, null, 2)}\n`);
    console.log("models:fetch ✓ models.lock.json updated. Review and commit it.");
  }
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
