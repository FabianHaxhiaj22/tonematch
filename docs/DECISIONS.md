# Decisions

Lightweight ADR log (SPEC §15 rule 9). Newest at the bottom. Each entry: date, decision, why, alternatives.

---

### D-001 · 2026-11-07 · Public repo, no open-source licence
- **Decision:** The GitHub repo is public, with no `LICENSE` file: all rights reserved. `package.json` has `"private": true` and `"license": "UNLICENSED"`.
- **Why:** Portfolio visibility; branch protection and secret scanning are free on public repos. The owner may build a business on this, so no rights are granted yet.
- **Alternatives:** Private repo (needs GitHub Pro for branch protection); MIT/Apache licence (rejected for now; can be added later).
- **Note (2026-11-19 / 2026-11-22):** the repo was found **private** (so branch protection wasn't available on GitHub Free). It was not made public again: the old PR refs still exposed the pre-rewrite history, so the clean history moved to a **new public `FabianHaxhiaj22/tonematch`**, and the old repo became the private `tonematch-archive` (D-031).

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
- **Alternatives:** Commit the binaries (≈ 33 MB); load from a CDN at runtime (rejected: privacy + reliability, SPEC §4).

### D-007 · 2026-11-07 · Share card is generated in the browser
- **Decision:** Canvas API or `html-to-image`; never `next/og`.
- **Why:** `next/og` renders on the server, which would send results off the device (SPEC §2.1), and doesn't work with a static export.

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
- **ITA guard:** `ita(lab, minB)` returns `null` when b* < `minB`, and throws if `minB` isn't a finite number > 0. The threshold value isn't hard-coded in `src/lib/color`; it will live in `src/lib/analysis/config.ts` as `ITA_MIN_B` (M4), and `depth.ts` falls back to L* on `null` (SPEC §6.4).
- **Hue for greys:** `hueAngle` returns 0 when a* = b* = 0 (hue undefined); callers check `chroma` first when it matters.
- **Alternatives:** culori's chromaticity-derived matrix and D65 (differs by ≤ 0.011 in L*, a*, b*); depending on culori at runtime (rejected: extra bundle weight for a few lines of maths).

### D-016 · 2026-11-07 · Face Landmarker setup (M2)
- **Source:** official guide https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js (`ai.google.dev` redirects there; no date shown), plus `vision.d.ts` and the bundle of the installed `@mediapipe/tasks-vision@1.2.2`. The guide doesn't cover workers, self-hosting or the matrix layout; those were taken from the package and verified by running it.
- **Worker:** `src/workers/landmarker.worker.ts`, classic WASM loader (see R-002). Main thread sends an `ImageBitmap` as a *transfer*; the worker closes it after `detect()`. The image is never stored.
- **Options:** `runningMode: "IMAGE"`, `outputFacialTransformationMatrixes: true`, blendshapes off, **`numFaces: 2`** (the quality gate must be able to see a second face to report `MULTIPLE_FACES`), **CPU delegate** (one still image is ~250 ms on 1280×1600; the GPU path in a worker needs OffscreenCanvas/WebGL and is revisited for the live camera in M7).
- **Matrix layout:** MediaPipe returns `{ rows, columns, data }`; the docs don't say the order. Measured on a real portrait: `data` is **column-major** (translation at `data[12..14]`, ≈ (0.9, 15.8, −63.2) cm). `src/lib/analysis/matrix.ts` converts it to row-major.
- **Dev-only route:** files named `page.dev.tsx` are pages only when `NODE_ENV=development` (`pageExtensions` in `next.config.ts`). In production builds they're not routes and aren't bundled: the build lists only `/` and `/_not-found`, no MediaPipe code ends up in `.next/static`, and `tests/e2e/dev-routes.spec.ts` checks `/dev/landmarks` → 404. Alternative rejected: `notFound()` in production, which still ships the page.
- **Placeholder regions:** M2 draws forehead and cheek *boxes* derived only from landmark sets MediaPipe exports (`FACE_LANDMARKS_FACE_OVAL`, `_LEFT_EYE`, `_RIGHT_EYE`, `_LIPS`), so no mesh indices were guessed. M3 replaces them with polygons from the canonical mesh map, with a cited source (SPEC §6.2).
- **Test photo:** verification used a public-domain NASA portrait from Wikimedia Commons. The owner later decided to commit it as a CI fixture (D-017).

### D-017 · 2026-11-13 · First real-face fixture: public-domain NASA portrait
- **Decision (owner):** commit `tests/fixtures/faces/nasa-watkins-2017.jpg` (official NASA portrait of astronaut Jessica Watkins, 2017, photographer Bill Stafford / NASA; 1280×1600 rendition from Wikimedia Commons) for pipeline tests in CI. Source, licence and SHA-256 are in `tests/fixtures/SOURCES.md`.
- **Why:** M2 verification used this image locally; M3's e2e tests need a real face (synthetic patches can't exercise face detection). It's **public domain** (work of a US federal agency; Commons: not copyrighted), so it meets SPEC §11 and rule 6.
- **Usage rules** (in SOURCES.md): test structure only (face found, landmarks, regions), **never publish analysis results about the person**, and don't imply NASA or the person endorses the project.
- **Alternatives:** images the owner provides with consent (still possible later); keeping real faces out of the repo entirely (rejected: CI couldn't test detection).
- **Limitation:** one portrait, one skin depth, studio lighting. See R-006.

### D-018 · 2026-11-13 · Second developer, co-author rule, per-developer identity
- **Who:** Erdiona Tola (`tolaerdiona-commits`, GitHub id 353759092) joins as co-developer. Repo role checked with `gh api repos/FabianHaxhiaj22/tonematch/collaborators/tolaerdiona-commits/permission` on 2026-11-13: **`write`** (push, triage, pull; no admin or maintain). Not changed. Branch protection (`enforce_admins: true`, required `ci` + `pr-title`) applies to both of us.
- **Listed as authors:** SPEC §18 "Authors" and `contributors` in `package.json` (name and GitHub profile URL; noreply emails removed from `package.json` on 2026-11-22).
- **Emails:** each developer commits with their own **GitHub noreply** address, set repo-locally; both addresses are listed in `docs/ONBOARDING.md` §4. A personal Gmail address was mentioned for Erdiona but is **deliberately not used**: the repo is public and commit trailers are permanent, and GitHub links co-authors through the noreply address just as well.
- **Co-author rule (from 2026-11-13; superseded on 2026-11-22 by D-032, which applies it to every commit):** when a PR is done by both of us, every commit **and** the squash commit end with `Co-authored-by:` for whichever of us isn't that commit's author. Single-author work gets no human co-author trailer. **Existing history is never rewritten.** Details and commands: SPEC §9.3, `docs/ONBOARDING.md` §8.
- **Claude Code on more than one machine:** the old rule "active gh account must be `FabianHaxhiaj22`" would block Erdiona's machine. It's now "the developer at this machine, who must be a listed author"; repo **settings** stay owner-only (SPEC §9.1, §15 rules 12–13).
- **Onboarding:** `docs/ONBOARDING.md` (nvm/Node 24, corepack/pnpm, `gh auth login` with your own account, repo-local noreply identity, install, `models:fetch`, all checks, workflow, co-author rule).
- **Alternatives:** GitHub's "Co-authored-by" only on the squash commit (rejected: the owner wants it on every commit of shared work); a CI check enforcing trailers (not now: can't tell automatically whether work was shared).

### D-019 · 2026-11-13 · LF line endings via `.gitattributes`; Windows setup documented
- **Problem:** on Windows, Git for Windows sets `core.autocrlf=true` in its system config, so files check out with CRLF. Prettier expects LF, and `pnpm format:check` failed on 39 untouched files on a fresh Windows setup (CI on Linux was green).
- **Decision:** add `.gitattributes` with `* text=auto eol=lf` (binaries marked `binary`), so every OS checks out LF regardless of the developer's git config. Windows setup (nvm-windows, corepack, Git Bash/PowerShell notes) added to `docs/ONBOARDING.md`.
- **Alternatives:** ask each developer to set `core.autocrlf=false` (rejected: touches global/system config, which SPEC §9.1 forbids, and is easy to forget); Prettier `"endOfLine": "auto"` (rejected: hides the problem and lets CRLF into commits).

### D-020 · 2026-11-13 · Skin regions and sampler (M3)
- **Indices** (`SKIN_REGION_INDICES` in `src/lib/analysis/config.ts`, with source links pinned to MediaPipe commits `a908d66` (canonical mesh + UV map) and `212f110` (`face_mesh_connections.py`)). Chosen on the UV map with MediaPipe's feature sets drawn over it, by rules rather than by eye: cheeks two vertex rings below the lower eyelid, lateral to the nose wing, above the nasolabial fold; forehead between the brows' top edge and one row below the face-oval top (*forehead moved up one ring in D-023*). The left cheek is the exact 3D mirror of the right (x → −x in the `.obj`), found by script. A script and the unit tests check that no eye, iris, lip, nose or face-oval landmark is a vertex of, or inside, a region.
- **Checked on the real fixture, and changed:** on the NASA portrait, a ~7° head turn already put the first cheek choice's outer corner (vertex 123) 0.9% of face width *outside* the face outline, on hair. Picking indices can't fix this (the far cheek moves outwards as the head turns), so: (1) the cheek's outer edge moved one vertex column inwards (117 → 50 → 187; mirror 346 → 280 → 411), and (2) at runtime every region is clipped to the face outline's convex hull moved inwards by `FACE_OUTLINE_INSET_FRACTION` (5% of face width). Chosen by the developers on 2026-11-13; alternatives were the original cheeks + clip, smaller cheeks without clip (2.3% margin at 7°, likely to fail before the ±20° gate), or relying on the ΔE filter to drop hair (rejected).
- **Mesh pitfall:** in `canonical_face_model.obj` the `vt` (UV) lines are **not** in vertex order; vertex i's UV comes from the `f v/vt` pairs. Reading `vt[i]` directly scrambles the map.
- **Sampler details:** pixels are taken by pixel-centre rasterisation (even-odd). Luminance trim by L\*, per region. Outliers: CIE76 ΔE\*ab from the trimmed per-channel median. Medians are per channel (marginal), which is robust and cheap. The overall colour is a weighted median over **pixels**, each region's weight split over its pixels (so a large forehead can't outvote the cheeks), renormalised over the regions that have enough pixels. Cheek disagreement is reported as ΔE and split into lightness |ΔL\*| and colour √(Δa\*² + Δb\*²): side light mostly changes lightness, while undertone (M4) depends on the colour part. On the fixture (studio key light from one side) the cheeks differ mostly in lightness, so `unevenLighting` is set, which is honest.
- **Resolution:** at ~140 px face width a cheek has fewer than `MIN_VALID_PIXELS` (300). M7 (camera) must capture at full resolution; the sampler flags such regions instead of guessing.
- **Not in M3:** the user-facing calibration flow (M7) and confidence scoring (M4). `/dev/landmarks` shows regions, kept pixels, medians, issues and tap-to-calibrate; it stays English-only and dev-only like M2.

### D-021 · 2026-11-13 · Quality gate measurements (M3)
- **Exposure, not skin lightness** (SPEC §6.1, D-010): `TOO_DARK` if more than 5% of face pixels are dark-clipped (any channel ≤ 5) or the image's 99th-percentile luma is below 90 (nothing in the frame reaches mid-tones); `TOO_BRIGHT` mirrors this (any channel ≥ 250; 1st-percentile luma above 150 = washed out). Tests: synthetic faces from very light to very deep skin in good light raise no exposure issue; underexposure, crushed shadows, blown highlights and washed-out frames do.
- **Colour cast** (*superseded by D-023: neutral-pixel cluster*), **refined from the spec's first wording** ("mean a\*/b\* of non-face background"): the whole background includes walls, clothes and hands, so a blue wall would read as a cast. We use the mean a\*/b\* of the **brightest 1%** of non-clipped, non-face pixels (the likeliest neutral surfaces). On the NASA fixture (neutral studio white balance) the top 1% read chroma ≈ 3, while the top 5% reached ≈ 11 (coloured objects and hands); a synthetic warm cast reads far above the limit. If too little background is visible the check is skipped, not failed.
- **Blur:** Laplacian variance on the central 60% × 60% of the face box (inset 20% per side), resampled to 256 px wide. Measuring the whole box let the sharp face/background edge hide a blurry face. On the fixture: sharp ≈ 1120, 3×3 box blur ≈ 76, 5×5 ≈ 22, 7×7 ≈ 9; the limit 40 sits between "slightly soft" and "blurry".
- **Head angle:** yaw/pitch/roll from R = Ry·Rx·Rz of the matrix's normalised 3×3 part; tests rebuild matrices from known angles. Roll (tilting the head sideways) is not flagged: it doesn't change which skin faces the camera.
- **Fixture result:** only `FACE_TOO_SMALL` (24% of the width; it's a waist-up portrait). All thresholds are heuristics; `docs/CALIBRATION.md` lists them for tuning.

### D-022 · 2026-11-13 · `jpeg-js` as a dev-only test decoder
- **Why:** unit tests run the sampler and quality gate on the real JPEG fixture, and Node has no image decoder. `jpeg-js@0.4.4`: pure JS, no dependencies, BSD-3-Clause, includes the CVE-2022-25851 fix.
- **Risk accepted:** no release since 2022; it only decodes our own fixture files in tests and is never shipped.
- **Alternatives:** `sharp` (native binaries, heavy for a test helper); committing a raw RGBA dump (~8 MB); testing only in the browser (the dev page isn't in the production build that e2e uses).

### D-023 · 2026-11-13 · Fixes after a real-photo test of PR #12
A developer tested PR #12 on a real selfie (not committed; a real person) with the head clearly turned and tilted, and a red curtain behind. Measurements from that photo are deliberately not recorded (SPEC §11). Three problems, and what changed:
1. **Forehead overlapped the brows.** Its lower edge was the brows' top edge (66–107–9–336–296). It now starts **one mesh ring higher** at 69–108–151–337–299 (each of these shares a triangle with a brow-top vertex in the canonical mesh, and none is a brow landmark). The ring above that is the face oval (67–109–10–338–297), i.e. the hairline, so the top edge is interpolated `FOREHEAD_HEIGHT_FRACTION` (0.5) of the way towards it. Same cited map and mesh. Trade-off: a thinner band (fixture: 1843 instead of 3865 kept pixels; still well above 300). Tests: on the fixture and on the canonical mesh at pitch −20°…+20° the whole forehead lies above every brow landmark.
2. **One cheek kept only about a tenth of the other's pixels.** Suspected cause: a self-intersecting polygon dropping pixels under even-odd fill. **Not reproduced**: rotating the canonical mesh through 105 poses (yaw ±30°, pitch ±20°, roll ±20°, including the tested pose) never makes a region polygon cross itself. What does reproduce is the **runtime clip** cutting the far cheek as the head turns: the far side of the face outline swings inwards faster than the cheek (orthographic canonical mesh: far/near ratio 0.73 at 15°, 0.59 at 19°, 0.18 at 25°; a real close-up selfie adds perspective). Changes, covering both explanations:
   - `isSimplePolygon` check; a crossing polygon is reordered by angle around its centroid (our regions are star-shaped) and reported in `reordered`.
   - The rasteriser uses the **nonzero** winding rule (same as even-odd for simple polygons, keeps the overlap otherwise).
   - **Cheek imbalance:** if one cheek keeps fewer than `CHEEK_MIN_PIXEL_RATIO` (0.4) × the other's valid pixels, it is left out of the overall median (the larger cheek carries its weight) and of the cheek comparison, and `cheekImbalance` is set for M4's confidence.
   - **Yaw limit ±15°** (pitch stays ±20°): `HEAD_TILTED` now fires at the tested pose.
   - Per-region `keptAreaFraction` (area kept by the clip) on the dev page, so a lost cheek on a real photo can be traced to the clip or elsewhere.
   - Tests use MediaPipe's canonical mesh vertices (Apache-2.0 fixture) to generate landmarks for any pose.
3. **`COLOR_CAST` false positive on a red curtain.** Replaces D-021's "brightest 1%" rule. Only **near-neutral, well-exposed** non-face pixels count (L\* 35–90, chroma ≤ 30, sampled every 2 px). Starting at their median a\*b\*, the estimate re-centres 4 times on the mean of candidates within ΔC 10, following the main cluster of neutral surfaces wherever a cast moved it. Flag if the centre's chroma > 10; skip if too few candidates or cluster members. Why not just a low-chroma cut: it hides strong casts (they push neutrals above the cut) and missed a cool cast entirely in a prototype. Measured: fixture 4.3 (neutral); fixture + warm cast 15.0; grey wall + warm/cool/tungsten 13.2/11.5/26.0; red curtain: skipped. Known limit: a tinted wall in neutral light looks like a grey wall in tinted light (the fixture's blue backdrop hides a cool cast); white-paper calibration is the answer.

### D-024 · 2026-11-13 · Cheeks moved to the apple of the cheek; clip to the visible outline
- **Finding:** on a near-frontal real selfie (head turned well under the 15° limit) one cheek kept only about **a third** of its area after the outline clip, while the synthetic tests suggested little loss below 15°. The left cheek also had an odd concave "arrow" shape (the notch at vertex 50).
- **Why the synthetic test overestimated:** it projected the canonical mesh **orthographically**. A selfie is taken at 25–45 cm, where perspective matters: the face-oval landmarks on the far side sit 5–8 cm behind the cheek, so when the head turns they project inwards, **onto the far cheek**, and the clip (to the face-oval hull) cut real, visible skin. With a pinhole camera at 25 cm, the old cheek keeps 35% at yaw −12°, close to what the photo showed; orthographic said 100%. The synthetic generator now uses perspective (default 35 cm, an arm's-length selfie; `distanceCm: null` for orthographic).
- **Decision (two parts):**
  1. **Cheeks on the apple of the cheek**, below the cheekbone and beside the nose wing: right 101–100–142–203–206–205, left (3D mirror) 330–329–371–423–426–425. This is the one-ring of mesh vertices around 36 / 266 without the outer vertex 50 and the nose-side 129, plus 206 below. Compact and convex on the cited map and on the fixture's real landmarks; at runtime each cheek is the convex hull of its landmarks, so noise can't dent it. No eye, brow, lip, nose or face-oval landmark is a vertex of, or inside, either cheek.
  2. **Clip to the visible outline** (convex hull of all 478 landmarks) instead of the face-oval hull. Facing the camera they're the same (orthographic: identical; at 35 cm within 0.3%), so hair protection is unchanged; when the head turns it follows the far cheek.
- **Result (canonical mesh, perspective):** both cheeks keep 100% at yaw ±15° at 25, 35 and 45 cm (target ≥ 70%), and still ≥ 93% at ±25° at 25 cm. The clip still trims at extreme turns (yaw −35°: 63% at 35 cm), which the yaw gate (±15°) already flags. Cheek imbalance (D-023) remains as a safety net. Tests assert the ≥ 70% target at ±15° for 25/35/45 cm and orthographic.
- **Alternatives:** keeping the old cheeks and only fixing the clip (old cheek at 25 cm still drops to 76% at −15° and 58% at −19°: too close to the edge); a smaller 5-vertex ring without 206 (similar robustness, ~20% fewer pixels); hand-picked shapes (rejected: indices must come from the cited map).

### D-025 · 2026-11-13 · Makeup affects the cheek sample
- **Finding:** in real-photo testing, cheek makeup (**blush**) pulled the cheek sample's hue strongly towards pink/red. Which photo and which values are deliberately not recorded (SPEC §11: numbers from real people go only into the consented calibration log).
- **What it means:** blush and bronzer sit exactly where the cheek regions are; the ΔE outlier filter can't remove makeup that covers the whole region, and we can't detect makeup reliably (like beauty filters, SPEC §6.1). Foundation also affects the forehead, but usually more evenly.
- **Decisions / follow-ups:**
  - **M7 guide-screen copy** (SPEC §3): add "No makeup on your cheeks if possible: blush and bronzer change their colour." (both `en` and `sq`, reviewed by a native speaker).
  - **M4:** consider giving the forehead more weight (currently 0.4 / 0.4 / 0.2), or down-weighting the cheeks when they are much redder than the forehead (a cheek-vs-forehead hue difference is a possible makeup signal). Decide with calibration data; tracked as R-007.
  - The UI must not claim to detect makeup.

### D-026 · 2026-11-18 · Photo undertone score and region weighting (M4)
- **Photo score:** `p = clamp(hueDelta(h, 55°) / 15°, −1, 1)`, using the **signed, wrapped** hue difference (hue angles are circular: our colour engine returns 0–360°, so without wrapping a pinkish 350° would have scored as maximally warm). Uses hue only, never L\* or chroma.
- **Half-width 15°, not 10°:** with 10° the neutral bucket (|s| ≤ 0.10) was only ±1° of hue; tests showed 8-bit rounding alone moves a painted colour's hue by up to 1.4°, enough to flip buckets. 15° maps the usual skin hue range (~40–70°) onto −1…+1. Still a heuristic for calibration.
- **Region weights:** normally 0.4 / 0.4 / 0.2. The forehead gets `FOREHEAD_WEIGHT_WHEN_CHEEKS_DOUBTFUL` (0.5; usable cheeks share the rest) when:
  1. a cheek looks **redder than the forehead**: cheek a\* higher by > 4, or hue angle lower by > 8°. This is relative to the same face, not an absolute a\* threshold, because deeper skin can naturally have higher a\* (an absolute rule would flag it). Blush, bronzer and natural flushing all trigger it.
  2. **one cheek was dropped** (too few pixels or imbalance, D-023).
  3. the cheeks **disagree in colour**: √(Δa\*² + Δb\*²) > 3. Real-photo testing in M3 showed cheek differences above this, mostly in b\*.
- Effects are limited to weights and photo confidence. Reason codes (`cheekRedness`, …) are internal; no user-facing string mentions makeup (a test scans both message files). *Narrowed 2026-11-27 (D-034): the photo tips may advise against makeup on the cheeks; results and notes still never mention it.*
- **Tests:** deep and very deep skin without makeup (cheeks slightly darker and redder than the forehead, as unmade-up skin often is) is not flagged; the same hue gives the same photo score at every depth; the quiz never sees depth.
- **Alternatives:** an absolute a\* threshold (rejected: depth-dependent); dropping the cheeks entirely when red (rejected: the forehead alone is a small sample and catches foundation and shine).

### D-027 · 2026-11-18 · Depth classes and the approximate MST index
- **Depth labels** from the classic ITA classes (very light > 55°, light 41–55°, intermediate 28–41°, tan 10–28°, brown −30–10°, dark < −30°; Chardon et al. 1991, Del Bino & Bernerd 2013, as commonly quoted, not re-checked against the papers here), named `very-light … very-deep`.
- **MST swatches:** the official values are in the site's bundle (`skintone.google/assets/index.e4e4b56c.js`, fetched 2026-11-18, SHA-256 `b42d16d1ac6945570f7533a0d2a492bae14c084318db54d6d6fdef595a10b2cd`) as CSS variables `--monk-scale-color-1…10` in HSL. Converted with our colour engine:

  | MST | HSL | sRGB | L\* | a\* | b\* | ITA° |
  |---|---|---|---|---|---|---|
  | 1 | 30, 50%, 92.9% | #f6ede4 | 94.2 | 1.5 | 5.4 | 83.0 |
  | 2 | 30, 50%, 90.6% | #f3e7db | 92.3 | 2.1 | 7.3 | 80.2 |
  | 3 | 40, 70.9%, 89.2% | #f7ead0 | 93.1 | 0.2 | 14.2 | 71.8 |
  | 4 | 40, 53.3%, 82.4% | #eadaba | 87.6 | 0.5 | 17.7 | 64.7 |
  | 5 | 36, 44.8%, 71.6% | #d7bd96 | 77.9 | 3.5 | 23.1 | 50.3 |
  | 6 | 32.4, 30.1%, 48.2% | #a07e56 | 55.1 | 7.8 | 26.7 | 10.9 |
  | 7 | 23.8, 32%, 38.6% | #825c43 | 42.5 | 12.3 | 20.5 | −20.1 |
  | 8 | 17.7, 29.7%, 29% | #604134 | 30.7 | 11.7 | 13.3 | −55.4 |
  | 9 | 26.3, 16%, 19.6% | #3a312a | 21.1 | 2.7 | 6.0 | −78.4 |
  | 10 | 26.7, 12.3%, 14.3% | #292420 | 14.6 | 1.5 | 3.5 | −84.3 |

- **Mapping (superseded by D-029: swatches are now display-only):** nearest swatch by ITA. ITA decreases strictly from MST 1 to 10, but L\* doesn't (MST 3 is lighter than MST 2), so ITA is the right axis. Swatch hues vary from 49° to 89° without pattern: the scale isn't an undertone scale, so hue is ignored.
- **Why "approximate":** the swatches are display colours, not skin measurements (MST 9–10 have very low chroma, unlike real deep skin), so nearest-swatch is only an approximation. The UI must always say so (message `depth.mstApprox`).
- **Licence:** CC BY 4.0 according to secondary sources (e.g. Wikipedia); not confirmed on the official page, whose text is rendered client-side. We store 10 numbers with attribution.
- **Fallback:** if b\* < `ITA_MIN_B` (4), ITA is estimated from L\* with b\* = 15 and depth is flagged `method: "lightness"`.

### D-028 · 2026-11-18 · Confidence formulas, quiz UI and messages before M8
- **Photo confidence** (before fusion): 1 × factors for each overridden warning (e.g. TOO_DARK 0.7, COLOR_CAST 0.6 or 0.95 if calibrated), no calibration 0.9, few pixels (1 at ≥ 2000 → 0.6 at ≤ 300), each low-pixel region 0.85, cheek imbalance 0.8, cheek colour disagreement (1 at 0 → 0.6 at ΔC ≥ 8, linear; e.g. ΔC 4 → 0.8), uneven light 0.95, cheeks redder than forehead 0.85; floor 0.05. Each factor is returned with its reason. No quiz input exists in its signature.
- **Overall confidence** (after fusion): (0.6 × photo + 0.4 × answered/4) × agreement, where agreement is 1 while |p − q| ≤ 0.5 and falls to 0.6 at |p − q| = 2. Notes: `photoQuizDisagree` (|p − q| > 1 with ≥ 2 answers), `lowPhotoConfidence` (< 0.4), `noQuizAnswers`.
- **Quiz UI** at `/quiz`: one question per screen as a native radio group (fieldset/legend), focus moves to each new question, ≥ 56 px targets, Back/Next and Enter to submit, summary with "change" links, no motion. State in a Zustand store, memory only. Results UI is M6; until then scores are visible on `/dev/landmarks`.
- **Messages before M8:** `src/i18n/messages/en.json` and `sq.json` in next-intl's nested format with `{placeholder}` syntax and a small typed lookup (`src/i18n/messages.ts`); no next-intl install or locale routing until M8, which will load these files unchanged. The quiz has its own en/sq switch (sets `lang` on the page). Albanian strings were drafted by Claude Code, then reviewed and rewritten by a native speaker (Erdiona Tola, 2026-11-18); `src/i18n/review/sq.json` marks each one `reviewed`, and a test fails if an sq string lacks a status (new or changed strings start as `needs-native-review`). "Not sure" is "Nuk e di", which is gender-neutral (unlike "i/e sigurt").

### D-029 · 2026-11-18 · Fixes after real-photo testing of PR #14
A developer tested PR #14 on `/dev/landmarks` with an evening indoor selfie (uncalibrated) and contradictory quiz answers. Results from that photo are deliberately not recorded (SPEC §11); the numbers below come from synthetic images. Three problems, and what changed:
1. **Depth label and MST could contradict each other** (a "very light" label next to a mid-scale MST). The label came from the ITA classes and MST from the nearest *display* swatch, two different partitions (ITA 55–57.5° fell in both "very light" and MST 5). Also, ITA depends on b\*, which is the undertone signal, so pinker skin read lighter, and the display swatches are much lighter than measured skin (MST 1 has L\* 94; fair skin in photos is ~65–75), so nearest-swatch read real light skin as MST 5 and rarely gave MST 9–10.
   - **One depth angle**, mostly L\*: `0.8 × atan((L* − 50) / 15) + 0.2 × ITA` (L\* term only when ITA can't be computed). With weight 0.3, sweeping b\* 10 → 25 still moved skin at L\* 65 by two MST steps; with 0.2 it's at most one at any lightness (tested).
   - **One table** (`DEPTH_SCALE`): angle → MST 1–10 → label. Label edges keep the classic ITA classes (55°, 41°, 28°, 10°, −30°); MST splits inside them (65°, 48°, −10°, −50°) are heuristic. A test sweeps > 2000 colours and checks label = label of MST every time.
   - The official swatch colours (D-027) stay in config for display only; nearest-swatch classification is dropped.
2. **Photo score saturated at the cap**: the photo's hue lay beyond the old ±15° clamp. Now `p = cap × tanh(Δh / 20°)`: linear near the centre, only approaching the cap far out (skin hues 40–70° stay below 0.7 even calibrated). Cap 1 with white-paper calibration, **0.6 without**, since camera white balance shifts hue. A hue that far out now gives a moderate score instead of the cap.
3. **A split quiz raised confidence and left the result unchanged** (q = 0 added confidence instead of pulling the score towards neutral). New quiz **consistency** = 1 − variance of answered values (all agree → 1, also all neutral; 2 + 2 → 0; 3 + 1 → 0.25):
   - the fused score is multiplied by `1 − 0.5 × (1 − consistency)` (pulled towards neutral);
   - in overall confidence the quiz's share is multiplied by consistency, and the total by `1 − 0.25 × (1 − consistency)`, so a 2 + 2 quiz ends up *below* the photo alone, while agreeing answers raise it (tested: 4/0 > 3/1 > 2/2, and 2/2 < no answers).
   - On a synthetic test photo (uncalibrated, with a clearly cool hue outside the old clamp): no quiz → cool, 54%; all cool → cool, 92%; all warm → neutral-warm, 70% with the "photo and quiz disagree" note; 2 + 2 → neutral-cool (s −0.12, was −0.43), 40%.
- **Decisions after review (2026-11-18, by the developers):**
  - `QUIZ_SPLIT_SHRINK` stays 0.5: a 2 + 2 quiz with a cool-leaning photo landing on neutral-cool is fine.
  - `AGREEMENT_MIN_FACTOR` 0.6 → **0.4**, so when the photo and quiz point in opposite directions confidence drops further: the all-warm case went from 70% to **59%** (target 55–60%, tested).
  - **Overall confidence is capped at 85% without white-paper calibration** (`OVERALL_MAX_UNCALIBRATED`); only a calibrated photo can go higher. The all-cool case went from 92% to **85%** (tested: an uncalibrated photo never exceeds the cap; calibrated can).
  - Synthetic test photo results now: no quiz → cool, 54%; all warm → neutral-warm, 59% with the disagreement note; all cool → cool, 85%; 2 + 2 → neutral-cool, 40%.

### D-030 · 2026-11-19 · Recommendation engine and data (M5)
- **Data holds ids, numbers and message keys; text lives in the message files.** SPEC §7.1 first put names "(en/sq)" in `metals.json` and copy in `src/data/copy/*.json`. That would split text across two systems and bypass the sq review list (D-028). Now `metals.json`, `gemstones.json` and `styles.json` reference message keys (`nameKey`, `labelKey`, `finishes`), and `src/data/copy/explanations.json` is the *template* file: which keys explain each outcome (a summary per undertone + `uncertain`; metal reasons by relation × tier). All strings are in `src/i18n/messages/{en,sq}.json`. The 65 new sq strings were drafted by Claude Code and native-speaker reviewed on PR #16 (2026-11-19): 16 rewritten (e.g. "Turkez", "vathë rrethorë", "detaj i vogël" instead of "theks"; pearl stays "Perlë"), all marked `reviewed`.
- **Schemas** (`src/lib/recommend/schema.ts`, Zod 4, strict) are shared by the engine (`data.ts` parses the files at load) and `pnpm validate:data`, which now also runs **cross-file checks** (`validate.ts`): every referenced message key exists in `en.json`, every engine note has `notes.<code>`, and every undertone × depth gets at least one style per category and one gemstone. The engine's input/output types and M4's labels are tied together at compile time.
- **Engine** (`src/lib/recommend/engine.ts`, pure; data injected):
  - Input = M4's result (`fromScoreResult`): undertone bucket, depth, MST (must belong to the depth, else `RangeError`), confidence 0–1, notes.
  - Each metal/gemstone has an affinity `{cool, neutral, warm}`; a bucket blends the columns (neutral-warm/-cool = `LEAN_WEIGHT` × warm/cool + rest × neutral). Metal tiers from `TIER_BEST_MIN` 0.8 / `TIER_GOOD_MIN` 0.55. With the data's scores this reproduces SPEC §7.2 (table-tested).
  - **Low confidence** (`< LOW_CONFIDENCE_THRESHOLD`, 0.5): recommend as if neutral, so the result is identical whatever M4's bucket was (tested); both families get a "best" metal, and within a tier metals follow the data's interleaved `order` instead of score, so neither family is listed as the winner. Note `bothCanWorkUncertain`, which also says how to improve the result (daylight, white paper, the quiz). The output still reports M4's undertone label. Exactly 0.5 ranks normally.
  - **Guard rules the data can't override** (tested with hostile data): the favoured family always has a "best" metal (both families when neutral or uncertain); in neutral-warm / neutral-cool every metal of the other family is at least "good" (copper/brass is "care" by score under neutral-cool and is lifted to "good").
  - **Depth** only selects finish/contrast advice (`styles.finishes`, three groups) and depth-filtered style items (delicate vs bold). Metal tiers, gemstones, summary and notes are identical across all depths and MST values (tested for every undertone, confident and uncertain).
  - Styles: items matching the depth and effective undertone, more specific (more filters) first, then file order, 3 per category. Gemstones: blended score ≥ 0.7, best first, at most 6.
  - Output = SPEC §7.3 plus `summaryKey` and `finishKey`; `StyleSuggestion = { id, tags, labelKey }`; notes are codes (M4's + `bothCanWork` / `bothCanWorkUncertain`) with messages at `notes.<code>`.
- **No face-shape rules** (Phase 2): the strict schema rejects a `faceShapes` field.
- **Safety test:** every possible output (5 undertones × 6 depths × 6 confidences × 2 note sets), every message in en and sq, and the raw data files are scanned for race/ethnicity/nationality and makeup/cosmetics words in English and Albanian (Unicode-aware word edges, since JS `\b` treats "ë" as a non-letter).
- **Config per module:** recommendation thresholds live in `src/lib/recommend/config.ts`, not `src/lib/analysis/config.ts`; CLAUDE.md rule 8 and SPEC §15 now say each module owns its config (owner's decision, 2026-11-19).
- **Starting values** are styling heuristics, listed in `docs/CALIBRATION.md` for tuning.
- **Alternatives:** names in the data files (rejected: two text systems, sq review bypassed); hand-written tier tables per undertone instead of affinity scores (simpler to read, but SPEC §7.1 asks for affinity scores and the guard rules would still be needed); hiding the "care" tier when uncertain (rejected: still useful, and identical across buckets anyway).

### D-031 · 2026-11-19 · One-time history rewrite (AI trailers, self-credit, personal emails)
- **Decision (owner, agreed by both authors):** rewrite `main` and the `v0.1.0` tag **once**. The rule "never rewrite existing history" (SPEC §9.3) stays in force after this.
  - Removed every Claude/Anthropic `Co-authored-by` trailer (8 commits, both spellings).
  - Mapped personal Gmail identities to the noreply ones in authors, committers and trailers (10 authors, 1 trailer); normalised the author name `FabianHaxhiaj` to `Fabian Haxhiaj`.
  - Removed self-credit trailers (co-author = the commit's own author; 6 commits). Cross-credit trailers (Erdiona on Fabian's commits, Fabian on Erdiona's) are kept.
  - Unchanged, verified per commit: file trees, author and committer dates, committer `GitHub <noreply@github.com>`, and every other byte of the messages (including GitHub's missing final newline).
- **Result:** `main` `5ade192` → `3054246` (12 commits), `v0.1.0` `2ba3b83` → `2d0dece`; the GitHub Release's target was updated to match. Force-pushed with `--force-with-lease=main:5ade192`.
- **Why:** the owner wanted Claude removed from the contributor list; and GitHub web squash-merges had recorded personal Gmail addresses as authors, against D-003 / D-018.
- **How:** `git filter-branch` with an env filter and a message filter in a separate clone (`git filter-repo` needs Python, which wasn't installed). A mirror clone and a bundle of the pre-rewrite repo were kept on the owner's machine (not in the repo).
- **Consequences:**
  - The 11 rewritten web-merge commits lost GitHub's "Verified" signature; rewritten commits are unsigned.
  - The old commits stayed reachable through the PRs' `refs/pull/*` refs (44 commits, including old `main` and the old `v0.1.0`, with Claude trailers and personal Gmail addresses), which only GitHub can remove. See "Publishing" below. `CHANGELOG.md`'s 0.1.0 link was updated to the new hash (`3a01f62`).
  - GitHub **closed both open PRs** when `main` was force-pushed (event `base_ref_force_pushed`): release PR #11 and Dependabot PR #15. Dependabot then deleted #15's branch, so `@dependabot rebase` couldn't run; it opens a new PR on its next scheduled run. release-please, finding no open release PR (and unable to link the rewritten release commit to PR #6), opened **#17** with the 0.2.0 changes on the new history. Later releases are unaffected.
  - Existing clones must re-sync (below). Branches based on the old history must be rebased with `--onto`.
- **Prevention:** the committed `.claude/settings.json` sets `attribution` to `{"commit": "", "pr": "", "sessionUrl": false}`; CLAUDE.md, SPEC §9.3 / §15 and ONBOARDING §8 say "no AI trailers, no self-credit"; both developers keep GitHub's "Keep my email addresses private" on, since web merges use that setting.
- **Re-sync an existing clone** (or simply re-clone and set the local identity again, ONBOARDING §4):
  ```bash
  git status                                   # commit or stash local work first
  git fetch origin --prune --prune-tags --tags --force
  git switch main && git reset --hard origin/main
  # a local branch started from the old main:
  git rebase --onto origin/main <old-main-commit> <branch>
  ```
- **Publishing (decided 2026-11-22, owner):** a pre-publication audit found no secrets, but the old history was still served through `refs/pull/*`. So, instead of making this repo public:
  - the old repo was renamed **`tonematch-archive`** and stays **private** (PR #1–#17 discussions are kept there);
  - a **new public `FabianHaxhiaj22/tonematch`** received only `main` and `v0.1.0` (no PR refs, no old objects);
  - settings, branch protection, collaborators, the release-please token and the v0.1.0 Release were set up again there (`docs/REPO_SETUP.md`).
  - Alternatives: asking GitHub Support to remove the cached PR refs (slow, and might delete the PRs anyway); publishing as is (would expose both developers' personal emails).
- **Docs cleaned at the same time:** measurements from the developers' own test selfies (colour values, scores, quiz answers, pose, pixel counts) and who wore makeup were removed from DECISIONS.md and CALIBRATION.md, keeping only the findings (SPEC §11). Older versions remain only in the private archive's history. The mesh fixture got a copy of its Apache-2.0 licence (`tests/fixtures/mediapipe/LICENSE`).

### D-032 · 2026-11-22 · Every commit and every squash merge credits the other author
- **Decision (owner, standing rule):** we work on everything together, so **every** commit and **every** squash merge ends with a `Co-authored-by:` trailer for the other author, with no exceptions (features, fixes, docs, chores, Dependabot follow-ups, release PRs). Commits made on Fabian's machine credit Erdiona; commits made on Erdiona's machine credit Fabian. When merging, the trailer goes in the squash message body (`gh pr merge <number> --squash --body "Co-authored-by: …"`), bot PRs included.
- **Replaces** D-018's "shared PRs only" rule. Unchanged: nobody credits themselves; no AI co-author trailers (D-031); existing history is never rewritten. Commits merged before this date keep their trailers as they are.
- **First application:** the Dependabot follow-up commit on #19 (MediaPipe checksums) was amended before merge to add the trailer; that changed an unmerged PR branch only, not `main`.
- **Why:** reflects how the work is actually done, and removes the judgement call of what counts as "shared".
- **Alternatives:** keep "shared PRs only" (rejected: every PR is shared); a CI check enforcing the trailer (possible later: commit-msg/PR checks can verify the other author's trailer is present, but a squash body is only known at merge time).
- Docs updated: SPEC §9.3, §15 rule 12 and §18, CLAUDE.md, `docs/ONBOARDING.md` §8, `docs/REPO_SETUP.md`.
- **Addition (2026-11-22, owner): bot PRs get both trailers.** For PRs authored by bots (Dependabot, release-please), the squash body carries **both** `Co-authored-by:` trailers, Fabian's and Erdiona's, whoever merges, since the bot is the author.
  - Why: on #19 and #20, GitHub made `dependabot[bot]` the author of the squash commit, so with only the other author's trailer, the merger's own work on the PR (e.g. #19's checksum commit) wasn't credited on `main`.
  - Deliberate exception to "nobody credits themselves": release-please opens its PRs with the owner's token, so GitHub records Fabian as the squash author (e.g. #21 → `2d1adb0`); those commits still get both trailers, so Fabian appears as author and co-author.
  - Merges before this addition (#19, #20, #21) keep their single trailer; history isn't rewritten.

### D-033 · 2026-11-22 · Public README; the build spec moves to `docs/SPEC.md`
- **Decision (owner):** the repo is public, so `README.md` becomes a short overview for visitors (what it does, privacy, how it works, limitations, status, getting started, engineering highlights, authors, licence). The former README, the internal build spec with the working rules for Claude Code, moves unchanged in substance to **`docs/SPEC.md`**, the source of truth for Claude Code. All "README §x" references (127, in docs, code comments, configs, workflows and templates) became "SPEC §x"; CLAUDE.md now says to read `docs/SPEC.md` first every session.
- **Why:** a recruiter or visitor should see what the project is and how it's built, not instructions for an AI assistant, decision numbers and owner setup commands.
- **Same review (public-readiness audit):** the developers' own test-selfie measurements were also removed from code comments and test names (tests now use round synthetic values for the same behaviour); noreply addresses now live only in `docs/ONBOARDING.md` §4/§8 and SPEC §9.3 (Claude Code needs the exact trailers); `package.json` got repository, homepage, bugs, keywords and author with names + GitHub URLs only; blank issues are disabled so every issue shows the "no face photos" note; `.gitignore` gained OS, editor and log patterns; SPEC §17 now matches the real scripts.
- **Alternatives:** keep the spec as README and add a short intro (rejected: it would still open with rules for Claude Code); split the spec into several docs (more churn for no reader benefit; one spec file stays easy for Claude Code to read in full).

### D-034 · 2026-11-27 · Visual direction "Atelier", design tokens and the M6a shell
- **Decision (owners):** of three mockup directions (Atelier, Écrin, Terra), the owners chose **Atelier**: ivory paper, ink and champagne gold, hairline rules, **Cormorant Garamond** (display, 24 px and up) + **Jost** (body). One change from the mockup: on the results page each style category sits in its own ivory card with a fine gold border. Tokens live in `src/app/globals.css` (`--tm-*`, light + dark via `prefers-color-scheme`, mapped to Tailwind with `@theme inline`); `tests/unit/design/tokens.test.ts` parses them and fails if any text pair drops below 4.5:1 or a focus ring below 3:1 (`contrastRatio()` in `src/lib/color`). Details in `docs/DESIGN.md`.
- **Fonts via `next/font/google`:** downloaded at build time and served from our own domain, so no browser request ever reaches Google (SPEC §2). Both are variable OFL fonts; the `latin` subset covers Albanian ç/ë. No new dependency.
- **Language switch before M8:** a working EN/SQ toggle in the header (Zustand `src/store/locale.ts`, moved out of the quiz store) that also sets `<html lang>`. It resets on a full reload; M8 replaces it with next-intl locale routing. A non-working placeholder was rejected (a dead control fails WCAG and confuses users). The quiz's own switch was removed.
- **Photo guide:** shown as a "Tips for a good photo" disclosure next to the upload, not a separate screen before it, because the upload is on the landing page. The tips cover what the app can't detect (filters, tinted glasses, makeup on the cheeks) and never claim to detect them.
- **Makeup wording (owners, native-speaker review 2026-11-27):** the cheeks tip says "No makeup on your cheeks if possible: it changes their colour" (sq: "Nëse mundesh, pa grim në faqe: grimi ua ndryshon ngjyrën."), as D-025 and SPEC §3 asked. D-026's rule is narrowed accordingly: the photo tips (`photo.tips.*`) are the only messages that may mention makeup, as advice before the photo; results, notes and everything else still never do, and the message test enforces both.
- **`/analyze` in M6a:** previews the chosen photo with "Continue to the questions" and "Choose another photo". M6b inserts quality checks and analysis there. The footer has no Privacy/About links until those pages exist (M8); the header links jump to landing-page sections.
- **Photo lifetime:** `src/store/flow.ts` holds the File and one object URL in memory. It is cleared and the URL revoked on "Choose another photo", on "Start again" (`startOver`, which also resets the quiz) and when the user is on any route outside `FLOW_ROUTES` (`FlowLifecycle` in the root layout). Unit- and e2e-tested (the e2e test checks the blob URL no longer resolves). Note: Next 16 keeps visited routes mounted but hidden (React `<Activity>`), so clearing the store, not unmounting, is what releases the photo.
- **Icons:** `src/app/icon.svg` (the two-ring mark; the plain ring switches colour in dark browser UI) and `src/app/apple-icon.png` (180 px, rendered by `scripts/render-apple-icon.ts`); `favicon.ico` removed. shadcn/ui and Motion stay out until a component needs them.
- **Alternatives:** Écrin (dark-first; most phones default to light, so most visitors would see its weaker variant) and Terra (friendliest, least "jewellery brand"); `@fontsource` packages (more dependencies for the same self-hosting); a separate guide screen (one more step before the upload).

### D-035 · 2026-11-27 · Photo formats: JPEG, PNG, WebP; HEIC gets a friendly message
- **Decision:** the picker accepts **JPEG, PNG and WebP**, checked by their **first bytes** (`src/lib/image`, pure and tested), not by MIME type or name; limit 30 MB (`MAX_PHOTO_BYTES`). **HEIC/HEIF** (ISO-BMFF `ftyp` brands `heic`, `heix`, `mif1`, …, or a `.heic`/`image/heic` name/type when the bytes are unreadable) gets a friendly "choose a JPG or PNG" message. HEIC is not in the input's `accept` list.
- **Why (research 2026-11-27, secondary sources, to verify on devices in M7):** iOS transcodes **Photos-library** picks to JPEG in Safari, Chrome, Firefox and Edge, whatever `accept` says ([zenn.dev](https://zenn.dev/kou_pg_0131/articles/safari-input-file-heic), [DEV 2026](https://dev.to/heicnow/handling-heic-uploads-from-iphones-in-2026-what-breaks-and-how-to-fix-it-58a2)). HEIC can still arrive as the original file from the **Files app**, from **macOS Safari**, or by drag and drop, sometimes with an empty or generic MIME type ([HN thread](https://news.ycombinator.com/item?id=23260987)). Only Safari 17+ decodes HEIC ([WWDC23](https://developer.apple.com/wwdc23/10122), [caniuse](https://caniuse.com/heic)), so accepting it would work on one browser only. Adding `image/heic` to `accept` has a reported Safari 17 side effect (files renamed to `.heic`, [Apple forums](https://developer.apple.com/forums/thread/743049)).
- **Follow-up M7 (phone testing):** check on real iPhones (Photos library, Files app, "Most Compatible" vs "High Efficiency" camera setting) and Android what actually arrives; if HEIC is common, consider decoding it where the browser can (Safari) before showing the message.
- **Follow-up M6b:** before analysis, **downscale to a 1600 px long side** (enough for the cheek and forehead regions, and keeps a 48 MP photo from stalling a mid-range phone) and **apply EXIF orientation** (decode with `createImageBitmap(file, { imageOrientation: "from-image" })`, which is also the default; verify that the bitmap the worker sees matches the upright preview). Put both numbers in `src/lib/image/config.ts`.
- **Alternatives:** accept HEIC and rely on Safari decoding (fails on other browsers with a confusing error); a WASM HEIC decoder (`libheif`, ~1 MB+; revisit only if M7 shows HEIC is common); trust the MIME type (unreliable for HEIC).

### D-037 · 2026-11-27 · Theme switch: Light / Dark / System
- **Bug:** the site only followed `prefers-color-scheme`. Choosing a theme for websites in browser settings changes that preference, but choosing one only for the browser's own UI doesn't, so users saw no change and had no way to pick a theme on the page.
- **Decision:** a theme button in the header opens a small panel with **Light / Dark / System** as native radio buttons (`src/features/theme/ThemeToggle.tsx`). It's a single button rather than three, because three icons plus the language switch don't fit a 360 px header. **System** (the default) follows `prefers-color-scheme`. **Light/Dark** set `<html data-theme>` and are remembered in `localStorage` under `tm-theme`. Choosing System removes the key, so by default nothing is stored. Other tabs follow the change (`storage` event), and the choice still applies for the page view when storage is blocked.
- **No flash:** an inline `<head>` script (`THEME_INIT_SCRIPT` in `src/lib/theme`, pure and tested) applies a stored choice before the first paint; `<html suppressHydrationWarning>` because it runs before hydration. In `globals.css` the dark tokens apply under the system preference unless `data-theme="light"`, and always under `data-theme="dark"`. The two dark blocks must stay identical, which the token test checks. `color-scheme` follows too (native scrollbars and form controls), and so does Tailwind's `dark:` variant (`@custom-variant`).
- **Tests:** unit tests cover parsing, the init script (stored, unexpected and blocked storage), and the toggle (choose, System clears storage, Escape, click outside, focus leaving, other tabs, blocked storage, Albanian). e2e covers a forced theme beating the system setting both ways, the right colours right after a reload, the inline script in `<head>` before `<body>`, storage holding only `tm-theme`, keyboard use, axe in both forced themes, and the header fitting at 360 px. One real bug was caught by e2e only: clicking a label inside the panel briefly blurs with no focus target, which closed the panel before the click landed. The panel now closes on blur only when focus moves to an element outside it.
- **Alternatives:** CSS `light-dark()` with one token set (cleaner, but Safari before 17.5 would lose all colours); a cookie read on the server (makes every page dynamic); `next-themes` (a dependency for ~60 lines of code).

*(There is no D-036: the number was skipped when D-037 was written on 2026-11-27. Noted 2026-11-28 so nobody goes looking for it.)*

### D-038 · 2026-11-28 · Photo analysis on /analyze (M6b-1)
The M6 plan (SPEC §14, agreed 2026-11-28) asked for: image preparation, landmarks in the worker, quality checks, skin sampling, releasing the photo after analysis, a quality report, status messages, lazy loading, versioned model caching and motion. How it was built, and the choices made on the way:
- **All pixel work happens in the worker.** The page sends the photo `File` (a cheap reference, not a copy) in an `analyse` request; the worker decodes it with `createImageBitmap(file, { imageOrientation: "from-image" })`, draws it at most 1600 px on the long side on an `OffscreenCanvas` (`fitLongSide`, `ANALYSIS_MAX_LONG_SIDE_PX` in `src/lib/image`), runs the landmarker, then the quality gate and the sampler (`analysePhoto` in `src/lib/analysis/pipeline.ts`, pure and tested), and posts back **numbers only**: the quality warnings or the blocking reason, plus a `PhotoSummary` (overall skin Lab + the photo-confidence evidence; `summarizePhoto` / `scorePhoto` in `score.ts`). The pixels never reach the page. The dev-only `detect` request is unchanged. *Alternative:* decode on the main thread and only detect in the worker (the M2 dev page does this), rejected: a 48 MP decode and the sampler would block the UI, and the pixels would live in two places.
- **The photo is released as soon as the analysis finishes, whatever the outcome**, before the user decides about warnings: `runAnalysis` (`src/features/analyze/runAnalysis.ts`) clears the flow store's photo and revokes its object URL. "Analyse anyway" needs nothing more than the numbers already kept. The only exception is a failed *load* (network, timeout, crashed worker): the photo stays so "Try again" works. An unreadable file is released. *Alternative:* keep the photo on the report screen as a thumbnail (rejected: the plan says only numbers remain, and the warnings are explained in words).
- **The analysis result outlives the route; the photo doesn't.** `src/store/analysis.ts` (memory only) keeps the summary when the user leaves the flow, so `/results` (M6b-2) and later pages keep working. It is cleared by a new photo, "Choose another photo" and "Start again". Leaving the flow *during* an analysis abandons it (the photo is gone, so there is nothing to finish).
- **The runner lives outside React.** Next 16 keeps visited routes mounted but hidden, and hiding a route tears down its effects, so an effect-owned analysis would be cut off. A generation counter and a photo-identity check drop results and progress for a photo that was replaced or cleared meanwhile.
- **A third blocking reason, `NOT_ENOUGH_SKIN`:** one face, but no region kept enough pixels for a colour. There is nothing to "analyse anyway", so it blocks like NO_FACE / MULTIPLE_FACES (pipeline level; `QualityCode` and SPEC §6.1 unchanged).
- **Quality report:** blocking → the reason and "Choose another photo" only; warnings → each warning's title and what to change, then "Choose another photo" (primary) or "Analyse anyway" (secondary), which accepts the warnings (they lower photo confidence, D-028) and goes to `/quiz`. A passed photo, and `/analyze` revisited after any result, shows "Your photo was analysed and removed" with "Continue to the questions" and "Choose another photo".
- **Status:** stages `preparing` → `loading-model` (only when the model isn't loaded yet) → `finding-face` → `checking`, in one `role="status"` region. The download note says "about 8 MB" (`MODEL_DOWNLOAD_MB`): **measured** 7.6 MB with gzip as `next start` serves it (19 MB uncompressed; VERSIONS.md). After `SLOW_LOAD_MS` (8 s) in `loading-model` a slow-connection note appears; the request times out after `ANALYSIS_TIMEOUT_MS` (180 s, enough for ~8 MB at 0.5 Mbit/s).
- **Finding: MediaPipe's loader blocks the worker.** `FilesetResolver` loads `vision_wasm_internal.js` with `importScripts`, which is synchronous. Loading the model in parallel with decoding therefore froze the worker on "preparing" until the loader arrived. The worker now decodes first, then reports `loading-model` and loads, so the stage shown is always the real one (caught by the e2e test that holds the model files).
- **Versioned model path with immutable caching:** `pnpm models:fetch` writes to `public/models/<tasks-vision version>-<8 hex of the model SHA-256>/` (`modelsVersion()` in `src/lib/models/paths.ts`, read from `models.lock.json` by the script, the worker and the e2e tests) and deletes anything else in `public/models/`. `next.config.ts` serves `/models/*` with `Cache-Control: public, max-age=31536000, immutable` (headers apply to `/public` files; checked in the Next 16.4.6 docs and by e2e). Upgrading the package or the model changes every URL, so a stale cached file can never be served. The CI cache key got a `v2` prefix for the new layout.
- **Lazy loading, checked:** the worker (and with it WASM and model) is created on the first analysis only. e2e visits `/`, `/quiz`, `/results` (a 404 until M6b-2) and an empty `/analyze` and asserts no `/models/*` request; another e2e asserts every request during analysis and the quiz is same-origin.
- **EXIF orientation, and a finding about sideways photos:** a photo stored sideways **without** an EXIF tag is still detected (MediaPipe copes with a 90° roll) and passes every check, since the gate deliberately ignores roll (D-021). So "a face was found" can't prove orientation was applied. The page therefore records the analysed size (`data-analysed-size`, numbers only), and e2e checks that the EXIF-rotated photo is analysed upright at the original's size while the same pixels without the tag are analysed sideways (the control), and that a 3200 × 2000 photo is analysed at 1600 × 1000. Real-phone checks remain for M7 (D-035).
- **Motion** (`motion` 14.14.0, SPEC §4): `<MotionRoot>` = `LazyMotion` (features from a separate chunk, `strict`) + `MotionConfig reducedMotion="user"`; `<Reveal>` fades content in with an 8 px rise (0.45 s, ease-out; warnings stagger by 70 ms). With `prefers-reduced-motion: reduce` nothing animates at all, not even the fade. The first paint never starts invisible: only views that appear after the first render animate. The progress line uses a CSS sweep under `motion-safe:` and is a static faint line otherwise. Scoped to `/analyze` for now; M6b-2 can move `<MotionRoot>` up to the layout.
- **Test photos** are derived from the public-domain NASA portrait at test time (`tests/e2e/support/photos.ts`: close-up, darkened, EXIF-rotated, sideways without EXIF, no-face gradient), so no new images are committed (SOURCES.md). jpeg-js copies a decoded `exifBuffer` back when re-encoding, so the helper encodes pixels only (this hid the sideways finding at first).
- **Strings:** 37 new `analyze.*` strings in en and sq; the sq drafts are `needs-native-review` (D-028). None mention makeup (message test).

---

## Open risks

### R-001 · CSP for MediaPipe (spec item K) · owner: M8 · *partly answered in M2*
**Measured in M2** (2026-11-07) on a production build: a candidate CSP was injected into every response (page and worker) with Playwright, then a portrait was analysed.

| Policy | Result |
|---|---|
| `script-src 'self' 'unsafe-inline'` (no wasm keyword) | ✗ `CompileError: WebAssembly.instantiate() … violates … script-src` |
| + `'wasm-unsafe-eval'` (no `'unsafe-eval'`), `worker-src 'self'`, `connect-src 'self'` | ✓ face detected, **no CSP violations** |
| same, but `worker-src 'none'` | ✗ worker creation blocked |
| same, but `connect-src 'none'` | ✗ `.wasm` download blocked |

So the MediaPipe part of the M8 policy is: `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'` (**no `blob:`**: Turbopack's worker is a same-origin file), `connect-src 'self'`. `'unsafe-eval'` is **not** needed. **Still open for M8:** replacing `'unsafe-inline'` for Next's inline scripts. A nonce-based CSP makes every page dynamic; a hash-based one keeps static rendering but is harder to maintain. Decide in M8 and record it here. **Also (2026-11-27, D-037):** the root layout has a small inline `<head>` script (`THEME_INIT_SCRIPT`, a constant string), which a hash-based CSP can allow by its SHA-256.

### R-002 · MediaPipe in a module Web Worker (spec item P) · ✅ closed 2026-11-07 (M2)
**Finding:** Turbopack starts workers as **classic** scripts even when the code asks for `{ type: "module" }` (its `turbopack-worker-*.js` bootstrap loads the bundle with `importScripts`). With the ES-module loader (`forVisionTasks(path, true)`), MediaPipe's `importScripts` *succeeds* and then fails on module syntax: `Failed to execute 'importScripts' on 'WorkerGlobalScope': Cannot use 'import.meta' outside a module`. **Fix:** the classic loader (`forVisionTasks("/models/wasm", false)`), whose `var ModuleFactory` becomes a worker global. Verified under `next dev` *and* a production build (`next start`): face detected, 478 landmarks, matrix returned, 0 cross-origin requests. No main-thread fallback needed. If Turbopack ever starts real module workers, MediaPipe fails loudly with "ModuleFactory not set": flip `USE_MODULE_LOADER` in the worker.

### R-003 · Dependabot and pnpm 12 · ✅ closed 2026-11-07
Dependabot detects pnpm and installs 12.18.0 from `packageManager`. Its first version-update PRs (#1 typescript, #2 @types/node) produced valid lockfiles and passed CI. Both were closed because they bumped majors held back by D-012; `dependabot.yml` now ignores those majors.

### R-005 · Dev-only `minimatch` advisory (GHSA-g3hv-75wg-m249, medium) · owner: next typescript-eslint release
`minimatch@10.2.6` comes in through `@typescript-eslint/typescript-estree@8.72.1` (`^10.2.2`); the fix is in `11.0.1`, a major that typescript-eslint doesn't accept yet, so Dependabot's security update can't apply it. Impact: denial of service via crafted glob patterns, in **lint-time tooling only** (not shipped to users; inputs are our own files). Options were: wait for typescript-eslint to bump; dismiss the alert as tolerable risk; or force `minimatch@11` with a pnpm override (may break typescript-eslint).
**Decision (owner, 2026-11-07):** alert #1 dismissed via the API as `tolerable_risk`. **Recheck when typescript-eslint updates:** run `pnpm why minimatch`; once no installed version is in the vulnerable range (`>=7.0.0 <11.0.1`), close this risk. If the alert is reopened or a higher-severity advisory appears, revisit.

### R-004 · Coverage threshold has nothing to measure yet · ✅ closed 2026-11-07 (M1)
With `src/lib/color` in place (100% covered), two checks confirmed the 90% threshold fails the run (exit 1) when it should: running only `tests/unit/color/srgb.test.ts` gave 54.5% statements, 26.7% branches, 36.4% functions and 56.3% lines → 4 threshold errors; and a throwaway `src/lib` file imported by no test was reported at 0% and pulled the totals below 90% → threshold errors. So untested files can't slip through.

### R-006 · Test portraits cover only one skin depth · owner: M3/M4
The only real-face fixture (D-017) is one studio portrait at one skin depth. SPEC §2 requires testing **across the full range of skin depths** (MST 1–10), and M3 (sampling, quality gate) and M4 (depth/undertone) need varied faces, lighting and cameras to avoid building in bias. **Needed:** more **openly licensed** portraits (public domain, CC0 or CC BY with attribution; e.g. other US-government official portraits) spanning light to very deep skin, plus some natural-light and phone-camera photos, each listed in `tests/fixtures/SOURCES.md` with source, licence and SHA-256. Images from consenting volunteers stay **on their devices** (SPEC §11 calibration set): only numbers are recorded. Close this when the fixture set spans the MST range. **M3 status (2026-11-13):** synthetic tests cover very light to very deep skin for the quality gate and sampler; the only real face is still the one portrait, so this stays open for M4.

### R-007 · Makeup on the cheeks (blush, bronzer) · owner: M4 (weighting), M7 (guide copy)
Blush or bronzer on the cheeks can make the cheek sample read strongly pink or warm (D-025). M7: guide-screen line "no makeup on the cheeks if possible". M4: test a higher forehead weight and/or a cheek-vs-forehead hue check against the calibration set before choosing weights. Close when both are done.
**M4 status (2026-11-18):** done in code with heuristic values (D-026: relative cheek-vs-forehead test, forehead weight 0.5, photo confidence × 0.85); still to calibrate on consented real photos. M7 guide copy remains.
**M6a status (2026-11-27):** the photo tips next to the upload now say "No makeup on your cheeks if possible: it changes their colour" (en + sq, native-speaker reviewed; D-034), so the guide copy is done; calibration remains.
