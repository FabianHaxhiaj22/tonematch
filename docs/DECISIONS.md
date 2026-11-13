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

---

## Open risks

### R-001 · CSP for MediaPipe (README item K) · owner: M8
WASM needs `'wasm-unsafe-eval'` in `script-src`; the worker likely needs `worker-src 'self'` (maybe `blob:`). In Next.js, a nonce-based CSP makes every page dynamic; a hash-based CSP keeps static rendering but is harder to maintain. Decide in M8 and record it here.

### R-002 · MediaPipe in a module Web Worker (README item P) · owner: M2
The tasks-vision loader has historically used `importScripts`, which module workers (what Turbopack creates) don't support. tasks-vision 1.2.2 ships a `vision_wasm_module_internal.*` variant that may solve this. M2 proves the worker setup first, with a main-thread fallback.

### R-003 · Dependabot and pnpm 12 · ✅ closed 2026-11-07
Dependabot detects pnpm and installs 12.18.0 from `packageManager`. Its first version-update PRs (#1 typescript, #2 @types/node) produced valid lockfiles and passed CI. Both were closed because they bumped majors held back by D-012; `dependabot.yml` now ignores those majors.

### R-005 · Dev-only `minimatch` advisory (GHSA-g3hv-75wg-m249, medium) · owner: next typescript-eslint release
`minimatch@10.2.6` comes in through `@typescript-eslint/typescript-estree@8.72.1` (`^10.2.2`); the fix is in `11.0.1`, a major that typescript-eslint doesn't accept yet, so Dependabot's security update can't apply it. Impact: denial of service via crafted glob patterns, in **lint-time tooling only** (not shipped to users; inputs are our own files). Options were: wait for typescript-eslint to bump; dismiss the alert as tolerable risk; or force `minimatch@11` with a pnpm override (may break typescript-eslint).
**Decision (owner, 2026-11-07):** alert #1 dismissed via the API as `tolerable_risk`. **Recheck when typescript-eslint updates:** run `pnpm why minimatch`; once no installed version is in the vulnerable range (`>=7.0.0 <11.0.1`), close this risk. If the alert is reopened or a higher-severity advisory appears, revisit.

### R-004 · Coverage threshold has nothing to measure yet · ✅ closed 2026-11-07 (M1)
With `src/lib/color` in place (100% covered), two checks confirmed the 90% threshold fails the run (exit 1) when it should: running only `tests/unit/color/srgb.test.ts` gave 54.5% statements, 26.7% branches, 36.4% functions and 56.3% lines → 4 threshold errors; and a throwaway `src/lib` file imported by no test was reported at 0% and pulled the totals below 90% → threshold errors. So untested files can't slip through.

### R-006 · Test portraits cover only one skin depth · owner: M3/M4
The only real-face fixture (D-017) is one studio portrait at one skin depth. README §2 requires testing **across the full range of skin depths** (MST 1–10), and M3 (sampling, quality gate) and M4 (depth/undertone) need varied faces, lighting and cameras to avoid building in bias. **Needed:** more **openly licensed** portraits (public domain, CC0 or CC BY with attribution; e.g. other US-government official portraits) spanning light to very deep skin, plus some natural-light and phone-camera photos, each listed in `tests/fixtures/SOURCES.md` with source, licence and SHA-256. Images from consenting volunteers stay **on their devices** (README §11 calibration set): only numbers are recorded. Close this when the fixture set spans the MST range.
