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

---

## Open risks

### R-001 · CSP for MediaPipe (README item K) · owner: M8
WASM needs `'wasm-unsafe-eval'` in `script-src`; the worker likely needs `worker-src 'self'` (maybe `blob:`). In Next.js, a nonce-based CSP makes every page dynamic; a hash-based CSP keeps static rendering but is harder to maintain. Decide in M8 and record it here.

### R-002 · MediaPipe in a module Web Worker (README item P) · owner: M2
The tasks-vision loader has historically used `importScripts`, which module workers (what Turbopack creates) don't support. tasks-vision 1.2.2 ships a `vision_wasm_module_internal.*` variant that may solve this. M2 proves the worker setup first, with a main-thread fallback.

### R-003 · Dependabot and pnpm 12 · owner: first Dependabot version-update PR
**Partly resolved 2026-11-07:** Dependabot detects pnpm and installs 12.18.0 from `packageManager`. Still to confirm: that its version-update PRs produce a valid lockfile and pass CI. If they don't, options: Renovate, or manual monthly bumps.

### R-005 · Dev-only `minimatch` advisory (GHSA-g3hv-75wg-m249, medium) · owner: next typescript-eslint release
`minimatch@10.2.6` comes in through `@typescript-eslint/typescript-estree@8.72.1` (`^10.2.2`); the fix is in `11.0.1`, a major that typescript-eslint doesn't accept yet, so Dependabot's security update can't apply it. Impact: denial of service via crafted glob patterns, in **lint-time tooling only** (not shipped to users; inputs are our own files). Options: wait for typescript-eslint to bump; dismiss the alert as tolerable risk; or force `minimatch@11` with a pnpm override (may break typescript-eslint). *Owner to decide.*

### R-004 · Coverage threshold has nothing to measure yet · ✅ closed 2026-11-07 (M1)
With `src/lib/color` in place (100% covered), two checks confirmed the 90% threshold fails the run (exit 1) when it should: running only `tests/unit/color/srgb.test.ts` gave 54.5% statements, 26.7% branches, 36.4% functions and 56.3% lines → 4 threshold errors; and a throwaway `src/lib` file imported by no test was reported at 0% and pulled the totals below 90% → threshold errors. So untested files can't slip through.
