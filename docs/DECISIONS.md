# Decisions

Lightweight ADR log (README §15 rule 9). Newest at the bottom. Each entry: date, decision, why, alternatives.

---

### D-001 · 2026-11-07 · Public repo, no open-source licence
- **Decision:** The GitHub repo is public, with no `LICENSE` file: all rights reserved. `package.json` has `"private": true` and `"license": "UNLICENSED"`.
- **Why:** Portfolio visibility; branch protection and secret scanning are free on public repos. The owner may build a business on this, so no rights are granted yet.
- **Alternatives:** Private repo (needs GitHub Pro for branch protection); MIT/Apache licence (rejected for now; can be added later).

### D-002 · 2026-11-07 · ESLint (flat config) + Prettier + jsx-a11y
- **Decision:** `eslint-config-next` (core-web-vitals + typescript) + full `jsx-a11y` recommended rules + `eslint-config-prettier`. Lint runs via `eslint .` (`next lint` was removed in Next 16).
- **Why:** Mature plugin ecosystem, especially jsx-a11y for the WCAG 2.2 AA target.
- **Alternatives:** Biome (faster, fewer a11y rules and plugins).

### D-003 · 2026-11-07 · Repo-local git identity
- **Decision:** `user.name` = "Fabian Haxhiaj" and `user.email` = the owner's GitHub noreply address, set with `git config --local`. Claude Code never changes the global git config. (The owner chose "authenticate Git: Yes" in `gh auth login`, which added gh as the credential helper in `~/.gitconfig`; no global identity is set.)
- **Why:** Keeps the personal email out of a public history; doesn't affect other repos.

### D-004 · 2026-11-07 · release-please uses a fine-grained PAT
- **Decision:** `release.yml` authenticates with the `RELEASE_PLEASE_TOKEN` secret: a fine-grained PAT limited to this repo (Contents, Issues, Pull requests: read & write).
- **Why:** PRs opened with `GITHUB_TOKEN` don't trigger other workflows, so the release PR would never get the required `ci` / `pr-title` checks.
- **Alternatives:** GitHub App token (more setup, no expiry to manage); admin bypass of required checks (weakens protection).

### D-005 · 2026-11-07 · PR titles are linted in CI
- **Decision:** `.github/workflows/pr-title.yml` (job `pr-title`, a required check) validates PR titles as Conventional Commits. Triggered by `pull_request`, not `pull_request_target`, so it never sees secrets.
- **Why:** Squash-merge makes the PR title the commit on `main`; commitlint in Husky only covers local commits.

### D-006 · 2026-11-07 · MediaPipe files: WASM from node_modules, model downloaded, both gitignored
- **Decision:** `pnpm models:fetch` copies the WASM from the pinned `@mediapipe/tasks-vision` package and downloads only `face_landmarker.task` from a versioned URL. SHA-256 checksums live in `scripts/models.lock.json`; `public/models/` is gitignored. `dev` and `build` run the fetch first (explicitly chained, not via pre-hooks).
- **Why:** No large binaries in git; WASM always matches the installed JS package; tampering or a silent upstream change fails the build.
- **Note:** Google doesn't publish a SHA-256 for the model, so the first download was cross-checked against the MD5 that Google Cloud Storage reports (`x-goog-hash`) and its SHA-256 recorded.
- **Alternatives:** Commit the binaries (≈ 33 MB); load from a CDN at runtime (rejected: privacy + reliability, README §4).

### D-007 · 2026-11-07 · Share card is generated in the browser
- **Decision:** Canvas API or `html-to-image`; never `next/og`.
- **Why:** `next/og` renders on the server, which would send results off the device (README §2.1), and doesn't work with a static export.

### D-008 · 2026-11-07 · `Permissions-Policy: camera=(self)` site-wide
- **Why:** App Router navigations don't reload the document, so a stricter policy on the landing page would still apply on `/analyze` and block the camera. Only `/analyze` code requests the camera.

### D-009 · 2026-11-07 · Undertone quiz: Q2 replaced, "not sure" on every question
- **Decision:** The burn/tan question is replaced by "In daylight, does your skin look more pink/rosy, golden/peachy, or neither?". Every question has "not sure / doesn't apply", which is skipped rather than scored as neutral.
- **Why:** Burn/tan measures depth/phototype (essentially Fitzpatrick), not undertone, and would bias deep skin towards "warm" and very light skin towards "cool".

### D-010 · 2026-11-07 · Quality gate judges exposure, not skin lightness
- **Why:** Deep skin in good light has a naturally low L*; a skin-L* threshold would wrongly flag it as "too dark".

### D-011 · 2026-11-07 · Dependencies installed per milestone
- **Decision:** M0 installs only what M0 uses. Other stack packages are listed as "planned" in `docs/VERSIONS.md` and installed (version re-checked) in the milestone that needs them.
- **Why:** No unused dependencies; versions checked when they're actually adopted.

### D-012 · 2026-11-07 · TypeScript 5.9 and ESLint 9 (newer majors held back)
- **Decision:** typescript 5.9.3 (latest is 7.0.2), eslint 9.39.5 (latest is 10.14.0).
- **Why:** typescript-eslint 8.72 supports TypeScript `<6.1`; eslint-plugin-jsx-a11y 6.10.2 supports ESLint ≤ 9. TypeScript 6.0.3 would work, but the owner chose to stay on 5.9.3 for now (2026-11-07).
- **Revisit:** When typescript-eslint supports TS 7 and jsx-a11y supports ESLint 10.

### D-013 · 2026-11-07 · Kept Next.js 16 template defaults: Cache Components + Partial Prefetching
- **Decision:** `cacheComponents: true` and `partialPrefetching: true` stay on, as generated by `create-next-app` 16.4.5.
- **Why:** They're the framework's current defaults for new apps; the app is mostly static/client-side.
- **Revisit:** In M8 when next-intl (locale routing in `src/proxy.ts`) is added: uncached data outside `<Suspense>` becomes a build error under Cache Components.

### D-014 · 2026-11-07 · Tooling details
- **pnpm 12:** settings live in `pnpm-workspace.yaml` (`saveExact`, `engineStrict`, `allowBuilds`). Dependency install scripts are blocked unless allowed; only `esbuild` is allowed (binary check, used by `tsx`).
- **Prettier ignores Markdown:** docs are hand-written prose with long tables; formatting them causes churn.
- **`AGENTS.md` is kept:** generated by `create-next-app` and re-added by `next dev`; it points agents to the version-matched Next.js docs in `node_modules/next/dist/docs/`.
- **`PROMPTS.md` is gitignored:** it's the owner's private prompt list and the repo is public (confirmed by the owner 2026-11-07).
- **Placeholder page:** M0's home page has inline English text; i18n (`en`/`sq` message files) arrives in M8.

### D-015 · 2026-11-07 · Colour engine: published sRGB matrix, D65 white, ITA guard as a parameter
- **Decision:** `src/lib/color` uses Lindbloom's published 7-decimal sRGB→XYZ (D65) matrix with D65 = (0.95047, 1, 1.08883), and the exact CIE ε = 216/24389, κ = 24389/27. It is dependency-free; culori is a dev-only cross-check.
- **Why:** These are the most widely published values, so results match common reference tables (red = 53.2408, 80.0925, 67.2032). The published Y row sums to 1.0000001, so greys get |a*| ≤ 1.7e-5: tens of thousands of times below a visible difference. We keep the published values rather than re-deriving them.
- **ITA guard:** `ita(lab, minB)` returns `null` when b* < `minB`, and throws if `minB` isn't a finite number > 0. The threshold value isn't hard-coded in `src/lib/color`; it will live in `src/lib/analysis/config.ts` as `ITA_MIN_B` (M4), and `depth.ts` falls back to L* on `null` (README §6.4).
- **Hue for greys:** `hueAngle` returns 0 when a* = b* = 0 (hue undefined); callers check `chroma` first when it matters.
- **Alternatives:** culori's chromaticity-derived matrix and D65 (differs by ≤ 0.011 in L*, a*, b*); depending on culori at runtime (rejected: extra bundle weight for a few lines of maths).

### D-016 · 2026-11-07 · Face Landmarker setup (M2)
- **Source:** official guide https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js (`ai.google.dev` redirects there; no date shown), plus `vision.d.ts` and the bundle of the installed `@mediapipe/tasks-vision@1.2.2`. The guide doesn't cover workers, self-hosting or the matrix layout; those were taken from the package and verified by running it.
- **Worker:** `src/workers/landmarker.worker.ts`, classic WASM loader (see R-002). Main thread sends an `ImageBitmap` as a *transfer*; the worker closes it after `detect()`. The image is never stored.
- **Options:** `runningMode: "IMAGE"`, `outputFacialTransformationMatrixes: true`, blendshapes off, **`numFaces: 2`** (the quality gate must be able to see a second face to report `MULTIPLE_FACES`), **CPU delegate** (one still image is ~250 ms on 1280×1600; the GPU path in a worker needs OffscreenCanvas/WebGL and is revisited for the live camera in M7).
- **Matrix layout:** MediaPipe returns `{ rows, columns, data }`; the docs don't say the order. Measured on a real portrait: `data` is **column-major** (translation at `data[12..14]`, ≈ (0.9, 15.8, −63.2) cm). `src/lib/analysis/matrix.ts` converts it to row-major.
- **Dev-only route:** files named `page.dev.tsx` are pages only when `NODE_ENV=development` (`pageExtensions` in `next.config.ts`). In production builds they're not routes and aren't bundled: the build lists only `/` and `/_not-found`, no MediaPipe code ends up in `.next/static`, and `tests/e2e/dev-routes.spec.ts` checks `/dev/landmarks` → 404. Alternative rejected: `notFound()` in production, which still ships the page.
- **Placeholder regions:** M2 draws forehead and cheek *boxes* derived only from landmark sets MediaPipe exports (`FACE_LANDMARKS_FACE_OVAL`, `_LEFT_EYE`, `_RIGHT_EYE`, `_LIPS`), so no mesh indices were guessed. M3 replaces them with polygons from the canonical mesh map, with a cited source (README §6.2).
- **Test photo:** verification used a public-domain NASA portrait from Wikimedia Commons. The owner later decided to commit it as a CI fixture (D-017).

### D-017 · 2026-11-13 · First real-face fixture: public-domain NASA portrait
- **Decision (owner):** commit `tests/fixtures/faces/nasa-watkins-2017.jpg` (official NASA portrait of astronaut Jessica Watkins, 2017, photographer Bill Stafford / NASA; 1280×1600 rendition from Wikimedia Commons) for pipeline tests in CI. Source, licence and SHA-256 are in `tests/fixtures/SOURCES.md`.
- **Why:** M2 verification used this image locally; M3's e2e tests need a real face (synthetic patches can't exercise face detection). It's **public domain** (work of a US federal agency; Commons: not copyrighted), so it meets README §11 and rule 6.
- **Usage rules** (in SOURCES.md): test structure only (face found, landmarks, regions), **never publish analysis results about the person**, and don't imply NASA or the person endorses the project.
- **Alternatives:** images the owner provides with consent (still possible later); keeping real faces out of the repo entirely (rejected: CI couldn't test detection).
- **Limitation:** one portrait, one skin depth, studio lighting. See R-006.

### D-018 · 2026-11-13 · Second developer, co-author rule, per-developer identity
- **Who:** Erdiona Tola (`tolaerdiona-commits`, GitHub id 353759092) joins as co-developer. Repo role checked with `gh api repos/FabianHaxhiaj22/tonematch/collaborators/tolaerdiona-commits/permission` on 2026-11-13: **`write`** (push, triage, pull; no admin or maintain). Not changed. Branch protection (`enforce_admins: true`, required `ci` + `pr-title`) applies to both of us.
- **Listed as authors:** README §18 "Authors" and `contributors` in `package.json` (name, GitHub noreply email, profile URL).
- **Emails:** each developer commits with their own **GitHub noreply** address, set repo-locally: Fabian `187953086+FabianHaxhiaj22@users.noreply.github.com`, Erdiona `353759092+tolaerdiona-commits@users.noreply.github.com`. A personal Gmail address was mentioned for Erdiona but is **deliberately not used**: the repo is public and commit trailers are permanent, and GitHub links co-authors through the noreply address just as well.
- **Co-author rule (from 2026-11-13):** when a PR is done by both of us, every commit **and** the squash commit end with `Co-authored-by:` for whichever of us isn't that commit's author. Single-author work gets no human co-author trailer. **Existing history is never rewritten.** Details and commands: README §9.3, `docs/ONBOARDING.md` §8.
- **Claude Code on more than one machine:** the old rule "active gh account must be `FabianHaxhiaj22`" would block Erdiona's machine. It's now "the developer at this machine, who must be a listed author"; repo **settings** stay owner-only (README §9.1, §15 rules 12–13).
- **Onboarding:** `docs/ONBOARDING.md` (nvm/Node 24, corepack/pnpm, `gh auth login` with your own account, repo-local noreply identity, install, `models:fetch`, all checks, workflow, co-author rule).
- **Alternatives:** GitHub's "Co-authored-by" only on the squash commit (rejected: the owner wants it on every commit of shared work); a CI check enforcing trailers (not now: can't tell automatically whether work was shared).

### D-019 · 2026-11-13 · LF line endings via `.gitattributes`; Windows setup documented
- **Problem:** on Windows, Git for Windows sets `core.autocrlf=true` in its system config, so files check out with CRLF. Prettier expects LF, and `pnpm format:check` failed on 39 untouched files on a fresh Windows setup (CI on Linux was green).
- **Decision:** add `.gitattributes` with `* text=auto eol=lf` (binaries marked `binary`), so every OS checks out LF regardless of the developer's git config. Windows setup (nvm-windows, corepack, Git Bash/PowerShell notes) added to `docs/ONBOARDING.md`.
- **Alternatives:** ask each developer to set `core.autocrlf=false` (rejected: touches global/system config, which README §9.1 forbids, and is easy to forget); Prettier `"endOfLine": "auto"` (rejected: hides the problem and lets CRLF into commits).

### D-020 · 2026-11-13 · Skin regions and sampler (M3)
- **Indices** (`SKIN_REGION_INDICES` in `src/lib/analysis/config.ts`, with source links pinned to MediaPipe commits `a908d66` (canonical mesh + UV map) and `212f110` (`face_mesh_connections.py`)). Chosen on the UV map with MediaPipe's feature sets drawn over it, by rules rather than by eye: cheeks two vertex rings below the lower eyelid, lateral to the nose wing, above the nasolabial fold; forehead between the brows' top edge and one row below the face-oval top (*forehead moved up one ring in D-023*). The left cheek is the exact 3D mirror of the right (x → −x in the `.obj`), found by script. A script and the unit tests check that no eye, iris, lip, nose or face-oval landmark is a vertex of, or inside, a region.
- **Checked on the real fixture, and changed:** on the NASA portrait, a ~7° head turn already put the first cheek choice's outer corner (vertex 123) 0.9% of face width *outside* the face outline, on hair. Picking indices can't fix this (the far cheek moves outwards as the head turns), so: (1) the cheek's outer edge moved one vertex column inwards (117 → 50 → 187; mirror 346 → 280 → 411), and (2) at runtime every region is clipped to the face outline's convex hull moved inwards by `FACE_OUTLINE_INSET_FRACTION` (5% of face width). Chosen by the developers on 2026-11-13; alternatives were the original cheeks + clip, smaller cheeks without clip (2.3% margin at 7°, likely to fail before the ±20° gate), or relying on the ΔE filter to drop hair (rejected).
- **Mesh pitfall:** in `canonical_face_model.obj` the `vt` (UV) lines are **not** in vertex order; vertex i's UV comes from the `f v/vt` pairs. Reading `vt[i]` directly scrambles the map.
- **Sampler details:** pixels are taken by pixel-centre rasterisation (even-odd). Luminance trim by L\*, per region. Outliers: CIE76 ΔE\*ab from the trimmed per-channel median. Medians are per channel (marginal), which is robust and cheap. The overall colour is a weighted median over **pixels**, each region's weight split over its pixels (so a large forehead can't outvote the cheeks), renormalised over the regions that have enough pixels. Cheek disagreement is reported as ΔE and split into lightness |ΔL\*| and colour √(Δa\*² + Δb\*²): side light mostly changes lightness, while undertone (M4) depends on the colour part. On the fixture (studio key light from one side) the cheeks differ mostly in lightness, so `unevenLighting` is set, which is honest.
- **Resolution:** at ~140 px face width a cheek has fewer than `MIN_VALID_PIXELS` (300). M7 (camera) must capture at full resolution; the sampler flags such regions instead of guessing.
- **Not in M3:** the user-facing calibration flow (M7) and confidence scoring (M4). `/dev/landmarks` shows regions, kept pixels, medians, issues and tap-to-calibrate; it stays English-only and dev-only like M2.

### D-021 · 2026-11-13 · Quality gate measurements (M3)
- **Exposure, not skin lightness** (README §6.1, D-010): `TOO_DARK` if more than 5% of face pixels are dark-clipped (any channel ≤ 5) or the image's 99th-percentile luma is below 90 (nothing in the frame reaches mid-tones); `TOO_BRIGHT` mirrors this (any channel ≥ 250; 1st-percentile luma above 150 = washed out). Tests: synthetic faces from very light to very deep skin in good light raise no exposure issue; underexposure, crushed shadows, blown highlights and washed-out frames do.
- **Colour cast** (*superseded by D-023: neutral-pixel cluster*), **refined from the README's first wording** ("mean a\*/b\* of non-face background"): the whole background includes walls, clothes and hands, so a blue wall would read as a cast. We use the mean a\*/b\* of the **brightest 1%** of non-clipped, non-face pixels (the likeliest neutral surfaces). On the NASA fixture (neutral studio white balance) the top 1% read chroma ≈ 3, while the top 5% reached ≈ 11 (coloured objects and hands); a synthetic warm cast reads far above the limit. If too little background is visible the check is skipped, not failed.
- **Blur:** Laplacian variance on the central 60% × 60% of the face box (inset 20% per side), resampled to 256 px wide. Measuring the whole box let the sharp face/background edge hide a blurry face. On the fixture: sharp ≈ 1120, 3×3 box blur ≈ 76, 5×5 ≈ 22, 7×7 ≈ 9; the limit 40 sits between "slightly soft" and "blurry".
- **Head angle:** yaw/pitch/roll from R = Ry·Rx·Rz of the matrix's normalised 3×3 part; tests rebuild matrices from known angles. Roll (tilting the head sideways) is not flagged: it doesn't change which skin faces the camera.
- **Fixture result:** only `FACE_TOO_SMALL` (24% of the width; it's a waist-up portrait). All thresholds are heuristics; `docs/CALIBRATION.md` lists them for tuning.

### D-022 · 2026-11-13 · `jpeg-js` as a dev-only test decoder
- **Why:** unit tests run the sampler and quality gate on the real JPEG fixture, and Node has no image decoder. `jpeg-js@0.4.4`: pure JS, no dependencies, BSD-3-Clause, includes the CVE-2022-25851 fix.
- **Risk accepted:** no release since 2022; it only decodes our own fixture files in tests and is never shipped.
- **Alternatives:** `sharp` (native binaries, heavy for a test helper); committing a raw RGBA dump (~8 MB); testing only in the browser (the dev page isn't in the production build that e2e uses).

### D-023 · 2026-11-13 · Fixes after a real-photo test of PR #12
A developer tested PR #12 on a real selfie (not committed; a real person): head turned (yaw −19°, roll −16.5°), red curtain behind. Three problems, and what changed:
1. **Forehead overlapped the brows.** Its lower edge was the brows' top edge (66–107–9–336–296). It now starts **one mesh ring higher** at 69–108–151–337–299 (each of these shares a triangle with a brow-top vertex in the canonical mesh, and none is a brow landmark). The ring above that is the face oval (67–109–10–338–297), i.e. the hairline, so the top edge is interpolated `FOREHEAD_HEIGHT_FRACTION` (0.5) of the way towards it. Same cited map and mesh. Trade-off: a thinner band (fixture: 1843 instead of 3865 kept pixels; still well above 300). Tests: on the fixture and on the canonical mesh at pitch −20°…+20° the whole forehead lies above every brow landmark.
2. **Right cheek 262 px vs left 2626.** Suspected cause: a self-intersecting polygon dropping pixels under even-odd fill. **Not reproduced**: rotating the canonical mesh through 105 poses (yaw ±30°, pitch ±20°, roll ±20°, including −19°/−16.5°) never makes a region polygon cross itself. What does reproduce is the **runtime clip** cutting the far cheek as the head turns: the far side of the face outline swings inwards faster than the cheek (orthographic canonical mesh: far/near ratio 0.73 at 15°, 0.59 at 19°, 0.18 at 25°; a real close-up selfie adds perspective). Changes, covering both explanations:
   - `isSimplePolygon` check; a crossing polygon is reordered by angle around its centroid (our regions are star-shaped) and reported in `reordered`.
   - The rasteriser uses the **nonzero** winding rule (same as even-odd for simple polygons, keeps the overlap otherwise).
   - **Cheek imbalance:** if one cheek keeps fewer than `CHEEK_MIN_PIXEL_RATIO` (0.4) × the other's valid pixels, it is left out of the overall median (the larger cheek carries its weight) and of the cheek comparison, and `cheekImbalance` is set for M4's confidence.
   - **Yaw limit ±15°** (pitch stays ±20°): `HEAD_TILTED` now fires at the tested pose.
   - Per-region `keptAreaFraction` (area kept by the clip) on the dev page, so a lost cheek on a real photo can be traced to the clip or elsewhere.
   - Tests use MediaPipe's canonical mesh vertices (Apache-2.0 fixture) to generate landmarks for any pose.
3. **`COLOR_CAST` false positive (23.7) on a red curtain.** Replaces D-021's "brightest 1%" rule. Only **near-neutral, well-exposed** non-face pixels count (L\* 35–90, chroma ≤ 30, sampled every 2 px). Starting at their median a\*b\*, the estimate re-centres 4 times on the mean of candidates within ΔC 10, following the main cluster of neutral surfaces wherever a cast moved it. Flag if the centre's chroma > 10; skip if too few candidates or cluster members. Why not just a low-chroma cut: it hides strong casts (they push neutrals above the cut) and missed a cool cast entirely in a prototype. Measured: fixture 4.3 (neutral); fixture + warm cast 15.0; grey wall + warm/cool/tungsten 13.2/11.5/26.0; red curtain: skipped. Known limit: a tinted wall in neutral light looks like a grey wall in tinted light (the fixture's blue backdrop hides a cool cast); white-paper calibration is the answer.

---

## Open risks

### R-001 · CSP for MediaPipe (README item K) · owner: M8 · *partly answered in M2*
**Measured in M2** (2026-11-07) on a production build: a candidate CSP was injected into every response (page and worker) with Playwright, then a portrait was analysed.

| Policy | Result |
|---|---|
| `script-src 'self' 'unsafe-inline'` (no wasm keyword) | ✗ `CompileError: WebAssembly.instantiate() … violates … script-src` |
| + `'wasm-unsafe-eval'` (no `'unsafe-eval'`), `worker-src 'self'`, `connect-src 'self'` | ✓ face detected, **no CSP violations** |
| same, but `worker-src 'none'` | ✗ worker creation blocked |
| same, but `connect-src 'none'` | ✗ `.wasm` download blocked |

So the MediaPipe part of the M8 policy is: `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'` (**no `blob:`**: Turbopack's worker is a same-origin file), `connect-src 'self'`. `'unsafe-eval'` is **not** needed. **Still open for M8:** replacing `'unsafe-inline'` for Next's inline scripts. A nonce-based CSP makes every page dynamic; a hash-based one keeps static rendering but is harder to maintain. Decide in M8 and record it here.

### R-002 · MediaPipe in a module Web Worker (README item P) · ✅ closed 2026-11-07 (M2)
**Finding:** Turbopack starts workers as **classic** scripts even when the code asks for `{ type: "module" }` (its `turbopack-worker-*.js` bootstrap loads the bundle with `importScripts`). With the ES-module loader (`forVisionTasks(path, true)`), MediaPipe's `importScripts` *succeeds* and then fails on module syntax: `Failed to execute 'importScripts' on 'WorkerGlobalScope': Cannot use 'import.meta' outside a module`. **Fix:** the classic loader (`forVisionTasks("/models/wasm", false)`), whose `var ModuleFactory` becomes a worker global. Verified under `next dev` *and* a production build (`next start`): face detected, 478 landmarks, matrix returned, 0 cross-origin requests. No main-thread fallback needed. If Turbopack ever starts real module workers, MediaPipe fails loudly with "ModuleFactory not set": flip `USE_MODULE_LOADER` in the worker.

### R-003 · Dependabot and pnpm 12 · ✅ closed 2026-11-07
Dependabot detects pnpm and installs 12.18.0 from `packageManager`. Its first version-update PRs (#1 typescript, #2 @types/node) produced valid lockfiles and passed CI. Both were closed because they bumped majors held back by D-012; `dependabot.yml` now ignores those majors.

### R-005 · Dev-only `minimatch` advisory (GHSA-g3hv-75wg-m249, medium) · owner: next typescript-eslint release
`minimatch@10.2.6` comes in through `@typescript-eslint/typescript-estree@8.72.1` (`^10.2.2`); the fix is in `11.0.1`, a major that typescript-eslint doesn't accept yet, so Dependabot's security update can't apply it. Impact: denial of service via crafted glob patterns, in **lint-time tooling only** (not shipped to users; inputs are our own files). Options were: wait for typescript-eslint to bump; dismiss the alert as tolerable risk; or force `minimatch@11` with a pnpm override (may break typescript-eslint).
**Decision (owner, 2026-11-07):** alert #1 dismissed via the API as `tolerable_risk`. **Recheck when typescript-eslint updates:** run `pnpm why minimatch`; once no installed version is in the vulnerable range (`>=7.0.0 <11.0.1`), close this risk. If the alert is reopened or a higher-severity advisory appears, revisit.

### R-004 · Coverage threshold has nothing to measure yet · ✅ closed 2026-11-07 (M1)
With `src/lib/color` in place (100% covered), two checks confirmed the 90% threshold fails the run (exit 1) when it should: running only `tests/unit/color/srgb.test.ts` gave 54.5% statements, 26.7% branches, 36.4% functions and 56.3% lines → 4 threshold errors; and a throwaway `src/lib` file imported by no test was reported at 0% and pulled the totals below 90% → threshold errors. So untested files can't slip through.

### R-006 · Test portraits cover only one skin depth · owner: M3/M4
The only real-face fixture (D-017) is one studio portrait at one skin depth. README §2 requires testing **across the full range of skin depths** (MST 1–10), and M3 (sampling, quality gate) and M4 (depth/undertone) need varied faces, lighting and cameras to avoid building in bias. **Needed:** more **openly licensed** portraits (public domain, CC0 or CC BY with attribution; e.g. other US-government official portraits) spanning light to very deep skin, plus some natural-light and phone-camera photos, each listed in `tests/fixtures/SOURCES.md` with source, licence and SHA-256. Images from consenting volunteers stay **on their devices** (README §11 calibration set): only numbers are recorded. Close this when the fixture set spans the MST range. **M3 status (2026-11-13):** synthetic tests cover very light to very deep skin for the quality gate and sampler; the only real face is still the one portrait, so this stays open for M4.
