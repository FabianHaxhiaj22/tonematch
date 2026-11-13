# ToneMatch — AI Jewellery Metal & Style Advisor

> Working name. Rename freely (search `ToneMatch` / `tonematch` across the repo).

ToneMatch is a web app where a user uploads (or takes) a selfie in natural light. The app analyses the skin **tone** (depth: light → deep) and **undertone** (cool / neutral / warm) and recommends the jewellery metals that suit them (yellow gold, rose gold, white gold, silver, platinum, mixed metals), plus jewellery styles (rings, earrings, necklaces, bracelets) and complementary gemstones.

**This README is the source of truth for Claude Code.** Claude Code: read this whole file before doing anything, then follow the phase plan in §14 and the working rules in §15. On the first run, generate a `CLAUDE.md` that summarises §15 and points back here.

---

## 1. Honest limitations (read before building)

These shape the whole design. They are not optional caveats.

1. **Undertone from a phone photo is noisy.** Phone cameras apply auto white balance, HDR, skin smoothing, and beauty filters. "Natural light" at noon, at golden hour, and under clouds gives different colours. The same person can come out warm in one photo and cool in another.
2. **"Warm → gold, cool → silver" is a styling rule, not a science.** The UI must present results as style guidance, never as a measurement of the person.
3. **Skin tone ≠ race or ethnicity.** The app must never infer, label, or store race/ethnicity.
4. **A face photo is personal data, and can be biometric data.** Albania's Law No. 124/2024 "On Personal Data Protection" is aligned with GDPR and treats biometric data as a special (sensitive) category. EU users are covered by GDPR.

Design responses to these:
- **On-device analysis.** The photo never leaves the browser. No upload, no storage.
- **Hybrid scoring.** Photo analysis + a short questionnaire (vein colour, skin cast in daylight, gold vs silver look, white vs off-white). Combine them.
- **Confidence score + "neutral" outcome.** Show low confidence honestly, and allow "both work for you".
- **Photo quality gate.** Detect and warn on what can be measured: exposure, colour casts, face count and size, blur, head tilt. What can't be detected reliably (beauty filters, skin smoothing, sunglasses/tinted glasses) is covered by the guide screen instead; the app must not claim to detect it.
- **Optional white-reference calibration.** The user can hold a plain white sheet of paper in frame and tap it for white balance correction.

---

## 2. Product principles

1. **Privacy first.** All image processing is client-side (WebAssembly/WebGL via MediaPipe). Only numeric results (L\*, a\*, b\*, scores) may ever be sent to a server, and only for the optional AI explanation.
2. **Explain, don't decree.** Every recommendation shows *why* (e.g. "Your skin reads slightly warm and medium depth, so yellow and rose gold add warmth…").
3. **Inclusive by default.** Test across the full range of skin depths. Use the open-source Monk Skin Tone (MST) 10-shade scale for depth display, not Fitzpatrick.
4. **Mobile first.** Most users will use a phone camera.
5. **Fast.** The analysis result should appear in under 3 s on a mid-range phone after the model loads.

---

## 3. Features by phase

### Phase 1: MVP (portfolio-ready)
- Landing page explaining how it works, with a privacy promise ("your photo never leaves your device").
- Photo input: file upload **and** live camera capture (`getUserMedia`), front camera default.
- Lighting/photo guide screen (face a window, no flash, no filters, remove glasses, hair off face).
- Photo quality checks: exactly 1 face, face large enough, brightness range, colour cast detection, blur estimate.
- Optional white-paper calibration (tap a white region → white balance gains).
- Skin sampling from cheeks + forehead via MediaPipe Face Landmarker.
- Colour analysis in CIELAB → depth (MST 1–10 approximation) + undertone score.
- 4-question undertone questionnaire (every question has a "not sure / doesn't apply" option), fused with the photo score.
- Results page:
  - Metal ranking (best → also good → use with care), with confidence.
  - Jewellery style suggestions per category (rings, earrings, necklaces, bracelets).
  - Gemstone palette.
  - Colour swatches of the user's sampled skin vs metal swatches.
- Downloadable/shareable **result card** image (no face on it by default), generated **in the browser**, never rendered on a server.
- English + Albanian (i18n).
- Fully responsive, accessible (WCAG 2.2 AA target).

### Phase 2: "Wow" features
- **Face-shape detection** (heuristic from landmark ratios) → earring and necklace shape advice.
- **Virtual try-on (AR):** overlay earrings/necklaces on the live camera feed using landmarks. Ear positions are approximated from face-contour landmarks, so label this as a preview.
- **Metal comparison view:** the user's photo side by side with gold vs silver colour tints near the jawline/neck.
- **AI stylist explanation:** a server route sends only the numeric results + questionnaire answers to the Claude API and returns a friendly, personalised paragraph. Never send the image.
- **Multi-photo averaging:** analyse 2–3 photos (different times/rooms) and average for stability.

### Phase 3: Business layer
- Product catalogue (JSON → database later) with affiliate links / partner jewellers.
- **B2B embeddable widget** for jewellery shops (script tag / iframe) that shows "metals that suit you" on their product pages.
- **Gift mode without a photo:** questionnaire-only flow ("buying for someone else"), so nobody's face is analysed without their consent.
- Optional accounts to save results (Supabase), with saved results containing numbers only.
- Clothing colour palette add-on (seasonal colour analysis), a natural upsell.

---

## 4. Tech stack & versions

> **Claude Code: versions below were checked in Nov 2026 and may have moved.** Before scaffolding, run `npm view <package> version` for every dependency, pin exact versions in `package.json`, and record them with the date in `docs/VERSIONS.md`. Never use `latest` or `*` in `package.json`. If a newer major exists than what's listed here, read its migration notes first and tell the user before adopting it.

| Layer | Choice | Version target | Notes |
|---|---|---|---|
| Runtime | Node.js | **24 LTS** (pin in `.nvmrc`) | Node 26 became LTS on 2026-10-28. Use 24 unless the deploy platform confirms 26 support. |
| Package manager | pnpm | latest stable (12.x) | Use `corepack enable pnpm`; pin via `packageManager` field. pnpm 12 reads its settings from `pnpm-workspace.yaml`, not `.npmrc`. |
| Framework | Next.js (App Router) | 16.x | TypeScript, `src/` dir, Turbopack. |
| UI library | React | 19.x | Whatever Next.js 16 requires. |
| Language | TypeScript | 5.x (latest supported by typescript-eslint) | `strict: true`, `noUncheckedIndexedAccess: true`. TS 6/7 exist but typescript-eslint 8.x doesn't support 7 yet; see `docs/DECISIONS.md`. |
| Styling | Tailwind CSS | 4.x | CSS-first config (`@theme`), no `tailwind.config.js` unless needed. Wired through `@tailwindcss/turbopack` (Next 16 template). |
| Components | shadcn/ui (+ Radix) | latest CLI | Copy-in components, accessible by default. |
| Animation | Motion (formerly Framer Motion) | latest | Respect `prefers-reduced-motion`. |
| Face landmarks | `@mediapipe/tasks-vision` (Face Landmarker) | pin exact version | **Self-host** the WASM files and `face_landmarker.task` model in `/public/models` (no CDN at runtime; better privacy + reliability). WASM is copied from the installed package; only the model is downloaded (see `models:fetch`, §17). |
| Colour math | Own module (`src/lib/color`) | n/a | sRGB → linear → XYZ (D65) → CIELAB. Optionally `culori` for cross-checking in tests. |
| Validation | Zod | latest | Validate questionnaire, API payloads, catalogue JSON. |
| State | Zustand | latest | Small store for the analysis flow. No Redux. |
| i18n | next-intl | latest | Locales: `en`, `sq`. Messages in `src/i18n/messages/`. Next.js 16 renamed `middleware.ts` to `proxy.ts`, so locale routing lives in `src/proxy.ts` (verify against the next-intl docs when wiring it up). |
| AI explanation (Phase 2) | Anthropic TypeScript SDK (`@anthropic-ai/sdk`) | latest | Server route only. Model: a small/fast Claude model (e.g. `claude-haiku-5-5`); check current model IDs at docs.claude.com before use. |
| Share card | Canvas API or `html-to-image` (client-side) | n/a | Generates PNG result cards **in the browser**. Not `next/og`: it renders on the server, which would send results off the device (§2.1) and doesn't work with a static export. |
| Unit tests | Vitest + Testing Library | latest | Colour math must have high coverage. |
| E2E tests | Playwright | latest | Uses synthetic fixture images (see §11). |
| Lint/format | ESLint (flat config) + Prettier, with `eslint-plugin-jsx-a11y` | latest | Decided (see `docs/DECISIONS.md`). `eslint-config-prettier` turns off rules that clash with Prettier. The `lint` script calls `eslint` directly (`next lint` was removed in Next.js 16). ESLint stays on 9.x until jsx-a11y supports 10. |
| Git hooks | Husky + lint-staged + commitlint | latest | Conventional Commits enforced. |
| CI | GitHub Actions | n/a | See §9. |
| Deploy | Vercel (default) or AWS (alt) | n/a | See §10. |
| Analytics | Vercel Analytics or Plausible | n/a | Cookieless, no PII. Never log images or colour values tied to an identity. |

---

## 5. Architecture

```
┌──────────────────────────── Browser (all image work here) ────────────────────────────┐
│                                                                                        │
│  Camera / Upload ──► Quality Gate ──► MediaPipe Face Landmarker (WASM, Web Worker)     │
│        │                                   │                                           │
│        │                     landmarks (478 pts)                                       │
│        ▼                                   ▼                                           │
│  [optional] White-paper calibration ──► Skin Sampler (cheeks + forehead polygons)      │
│                                            │                                           │
│                                   filtered skin pixels                                 │
│                                            ▼                                           │
│                               Colour Engine (sRGB → CIELAB)                            │
│                                            │                                           │
│                       L*, a*, b*, hue angle h°, ITA°, chroma C*                        │
│                                            ▼                                           │
│     Questionnaire ───────────────►  Score Fusion  ──► { depth, undertone, confidence } │
│                                            ▼                                           │
│                              Recommendation Engine (rules + JSON data)                 │
│                                            ▼                                           │
│                                   Results UI / Share card                              │
└────────────────────────────────────────────┬───────────────────────────────────────────┘
                                             │ numbers only (Phase 2, opt-in)
                                             ▼
                               Next.js Route Handler /api/explain
                                 (rate-limited, Zod-validated)
                                             │
                                             ▼
                                        Claude API
```

- MediaPipe runs in a **Web Worker** so the UI thread doesn't freeze.
- The `ImageBitmap`/canvas is discarded after analysis. Nothing goes to `localStorage` except optional numeric results if the user clicks "remember my result".

---

## 6. Analysis algorithm spec

Implement in `src/lib/analysis/`. Every function must be **pure and unit-tested**. All thresholds go in `src/lib/analysis/config.ts` as named constants with comments, because they **will** need calibration.

### 6.1 Quality gate (`quality.ts`)
Return `{ ok: boolean, issues: QualityIssue[] }` (plus the raw metrics, for the debug view and calibration). `NO_FACE`/`MULTIPLE_FACES` are blocking; the rest are warnings. Issues:
- `NO_FACE`, `MULTIPLE_FACES`
- `FACE_TOO_SMALL` (face bbox < ~25% of image width)
- `TOO_DARK` / `TOO_BRIGHT`, judged on **exposure, not skin lightness**: the fraction of clipped pixels (near 0 or 255 in any channel) in the face region, plus the whole-image luminance histogram. **Never use the skin sample's mean L\* for this**: deep skin in good light has a naturally low L\* and must not be flagged as "too dark".
- `COLOR_CAST`, judged only on **near-neutral, well-exposed** non-face pixels (low chroma, mid L\*): the centre of their main cluster in the a\*b\* plane, so a red curtain or blue wall isn't read as a cast. If there are too few such pixels the check is skipped. Suggest calibration (D-023).
- `BLURRY` (variance of Laplacian of the central face area, resampled to a fixed width, below threshold)
- `HEAD_TILTED` (from the face transformation matrix: yaw beyond ±15°, pitch beyond ±20°; yaw was tightened from ±20° because turning shrinks the far cheek fast, D-023)

Warnings can be overridden by the user ("analyse anyway"), and that lowers confidence.

Not detected, because there is no reliable signal: beauty filters, skin smoothing, sunglasses/tinted glasses. The guide screen covers these, and the UI must not claim to detect them.

### 6.2 Skin sampling (`sampler.ts`)
- Use Face Landmarker (IMAGE mode, `outputFacialTransformationMatrixes: true`), in `src/workers/landmarker.worker.ts`. The matrix arrives as column-major flat data; convert it with `src/lib/analysis/matrix.ts` (see `docs/DECISIONS.md` D-016).
- Build polygons for **left cheek, right cheek, forehead** from mesh landmarks. **Choose the indices from the official MediaPipe canonical face mesh map, and document the chosen indices in a comment with a link to the source.** Don't guess them.
- Exclude eyes, brows, lips, nostrils, and hairline. The forehead starts one mesh ring above the brows and stops part-way to the hairline (D-023).
- Clip each polygon to the face outline moved inwards by a configurable margin (`FACE_OUTLINE_INSET_FRACTION`), so a turned head doesn't push a cheek onto hair or the face side (D-020).
- Rasterise polygons to a mask (nonzero winding rule; a polygon that crosses itself is reordered by angle first); collect pixels.
- Filtering:
  1. Drop pixels in the top 10% and bottom 10% of luminance (specular highlights, shadows).
  2. Drop pixels far from the region's median in Lab (ΔE > configurable threshold, ~15) to remove blemishes/hair.
  3. Require at least N valid pixels per region (e.g. 300) or flag low confidence.
- Per region compute the **median** Lab. Overall = weighted median (cheeks 0.4 each, forehead 0.2). Report the disagreement between left and right cheek (uneven lighting signal → lowers confidence), as ΔE and split into lightness and colour parts. If one cheek keeps under 40% of the other's pixels, leave it out (the larger cheek carries its weight) and flag it (lower confidence).

### 6.3 White balance (`whiteBalance.ts`)
- **Calibrated mode:** the user taps a white paper region → average linear RGB of a small patch → per-channel gains so the patch becomes neutral. Apply to skin pixels before conversion.
- **Uncalibrated mode:** no correction by default (gray-world correction distorts skin). Just detect casts and lower confidence.

### 6.4 Colour conversion (`src/lib/color/`)
- sRGB (0–255) → linear RGB (inverse gamma) → XYZ (D65, standard sRGB matrix) → CIELAB (D65 reference white).
- Derived values:
  - Chroma `C* = sqrt(a*² + b*²)`
  - Hue angle `h° = atan2(b*, a*)` in degrees. Higher = more yellow (warmer), lower = more red/pink (cooler).
  - Individual Typology Angle `ITA° = atan((L* − 50) / b*) × 180/π`, used for **depth**. **Guard against `b* ≈ 0`** (division by zero): if `b*` is below a configurable minimum (`ITA_MIN_B` in config), don't compute ITA; fall back to L\* for depth and lower confidence. Skin `b*` is normally clearly positive, so this mainly catches bad samples.
- Unit-test against known reference conversions (pure white, pure black, mid-gray, a few published sRGB↔Lab pairs). Cross-check with `culori` in tests.

### 6.5 Depth (`depth.ts`)
- Map ITA° (primary) and L\* (secondary) to: `very-light | light | medium | tan | deep | very-deep`, and approximate an MST 1–10 index for display. Keep the mapping table in config. **Label the MST value as approximate.**

### 6.6 Undertone (`undertone.ts`)
- Photo undertone score `p ∈ [−1, +1]` (−1 cool, +1 warm), from the hue angle relative to a configurable neutral centre, scaled by a configurable width. Start with a neutral centre around the typical skin hue range and **calibrate with real test photos**. Document that initial values are heuristics.
- **Photo confidence** `photoConfidence ∈ [0, 1]` is computed **before fusion**, from photo evidence only: quality issues (and any "analyse anyway" overrides), valid pixel count, left/right cheek agreement, and whether calibration was used. It must not depend on the questionnaire.
- Questionnaire. Each question has four answers. Cool → −1, warm → +1, neutral → 0, and **"not sure / doesn't apply" is skipped** (it is not counted as neutral):
  1. Veins on your inner wrist look… blue/purple (cool) · green/olive (warm) · a mix of both (neutral) · not sure / doesn't apply
  2. In daylight, does your skin look more… pink/rosy (cool) · golden/peachy (warm) · neither (neutral) · not sure / doesn't apply
  3. Which looks better next to your face… silver (cool) · gold (warm) · both (neutral) · not sure / doesn't apply
  4. Pure white vs off-white/cream clothing… pure white (cool) · cream (warm) · both (neutral) · not sure / doesn't apply
- Questionnaire score `q ∈ [−1, +1]` = mean of the **answered** questions; `answeredCount` = how many were answered (0–4).
- A sun-reaction question (burn vs tan) was deliberately **not** used. It measures depth/phototype (essentially Fitzpatrick), not undertone, and would push deep skin towards "warm" and very light skin towards "cool".
- Fusion: `s = w_p·p + w_q·q`, with `w_p = 0.6·photoConfidence` and `w_q = 1 − w_p`. If `answeredCount = 0`, use `s = p`. All weights configurable.
- Classification uses explicit cut-points in config (initial values are heuristics, to be calibrated):

  | Fused score `s` | Label | Shown as |
  |---|---|---|
  | `s < −0.25` | `cool` | cool metals first |
  | `−0.25 ≤ s < −0.10` | `neutral-cool` | both families, cool slightly ahead |
  | `−0.10 ≤ s ≤ +0.10` | `neutral` | "both work for you" |
  | `+0.10 < s ≤ +0.25` | `neutral-warm` | both families, warm slightly ahead |
  | `s > +0.25` | `warm` | warm metals first |

- **Overall confidence** is computed **after fusion** = f(`photoConfidence`, `answeredCount`, photo/questionnaire agreement). It is **stored as 0–1** (as in §7.3) and displayed as a percentage. If photo and questionnaire strongly disagree (configurable threshold), add a note and say so in the UI.

### 6.7 Face shape (Phase 2, `faceShape.ts`)
- Ratios from landmarks: face length / cheekbone width, jaw width / cheekbone width, forehead width / cheekbone width, jaw angle.
- Classes: `oval | round | square | heart | oblong | diamond`. Always return a confidence and show "best guess".

---

## 7. Recommendation engine

`src/lib/recommend/` is a **pure rules engine** over JSON data in `src/data/`. No AI is needed here. The rules are deterministic and testable.

### 7.1 Data files
- `src/data/metals.json`: id, names (en/sq), swatch hex, undertone affinity scores `{ cool, neutral, warm }` (0–1), depth notes.
- `src/data/styles.json`: per category (rings, earrings, necklaces, bracelets): style items with tags (`delicate`, `statement`, `hoop`, `drop`, `stud`, `chain-length`, …) and rules by depth, undertone, and (Phase 2) face shape.
- `src/data/gemstones.json`: gemstone palettes by undertone.
- `src/data/copy/*.json`: explanation templates per outcome, in both languages.

Validate all data files with Zod at build time (`pnpm validate:data`).

### 7.2 Default style rules (editable starting point)
These are common styling conventions, not science.

| Undertone | Best metals | Also good | Gemstones (examples) |
|---|---|---|---|
| Warm | Yellow gold, rose gold | Copper/brass tones, mixed metals | Citrine, amber, peridot, coral, garnet, turquoise |
| Cool | Silver, white gold, platinum | Rose gold (light), mixed metals | Sapphire, amethyst, emerald, aquamarine, ruby, pearl |
| Neutral | All metals; mixed metals shine | n/a | Most stones; jewel tones and pastels |

| Face shape (Phase 2) | Earrings that usually flatter |
|---|---|
| Oval | Almost anything |
| Round | Long drops, angular/geometric, linear |
| Square | Hoops, rounded/oval drops, soft curves |
| Heart | Teardrops, chandeliers wider at the bottom |
| Oblong | Studs, wide hoops, clusters |
| Diamond | Studs, teardrops, curved shapes |

Depth can add contrast advice (e.g. high-polish vs brushed finishes, delicate vs bold pieces). Keep these as data, not code.

### 7.3 Output type
```ts
type Recommendation = {
  undertone: 'cool' | 'neutral-cool' | 'neutral' | 'neutral-warm' | 'warm';
  depth: Depth;
  mstApprox: number;           // 1–10
  confidence: number;          // 0–1
  metals: { id: string; tier: 'best' | 'good' | 'care'; reasonKey: string }[];
  styles: Record<Category, StyleSuggestion[]>;
  gemstones: string[];
  notes: string[];             // e.g. "photo and quiz disagreed"
};
```

---

## 8. Folder structure

```
.
├── .github/
│   ├── workflows/ci.yml
│   ├── workflows/pr-title.yml
│   ├── workflows/release.yml
│   ├── dependabot.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── ISSUE_TEMPLATE/{bug.yml,feature.yml}
├── docs/
│   ├── VERSIONS.md            # pinned versions + date checked
│   ├── DECISIONS.md           # ADR-style log of technical decisions
│   ├── CALIBRATION.md         # how thresholds were tuned, test results
│   ├── PRIVACY.md             # data flow + privacy notice source text
│   ├── ONBOARDING.md          # setup guide for a new developer (start here)
│   └── REPO_SETUP.md          # GitHub settings: protection, secrets, Dependabot, release-please, collaborators
├── public/models/             # self-hosted MediaPipe wasm + face_landmarker.task (gitignored; filled by models:fetch)
├── scripts/                   # fetch-models.ts (+ models.lock.json checksums), validate-data.ts
├── src/
│   ├── app/[locale]/          # pages: /, /analyze, /quiz, /results, /privacy, /about
│   ├── app/api/explain/route.ts   # Phase 2
│   ├── components/            # UI (shadcn in components/ui)
│   ├── app/dev/               # dev-only routes (`page.dev.tsx`): exist under `next dev` only, never in production builds
│   ├── features/analyze/      # camera, upload, calibration, quality UI; landmarkerClient.ts (worker wrapper)
│   ├── features/results/      # results, share card, try-on (Phase 2)
│   ├── lib/color/             # colour math (pure)
│   ├── lib/analysis/          # quality, sampler, depth, undertone, fusion, config
│   ├── lib/recommend/         # rules engine (pure)
│   ├── workers/landmarker.worker.ts   # + landmarker.protocol.ts (message types)
│   ├── data/                  # metals/styles/gemstones/copy JSON
│   ├── i18n/                  # next-intl config + messages/en.json, messages/sq.json
│   ├── store/                 # zustand store
│   └── proxy.ts               # next-intl locale routing (Next.js 16 name for middleware.ts)
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── fixtures/              # synthetic + openly licensed test images, listed in SOURCES.md (see §11)
├── CLAUDE.md                  # generated by Claude Code from §15
├── AGENTS.md                  # added by Next.js: points agents to node_modules/next/dist/docs/
├── CHANGELOG.md               # managed by release-please
├── release-please-config.json
├── .release-please-manifest.json
├── .nvmrc
├── .env.example
└── README.md
```

---

## 9. GitHub setup, versioning & workflow

### 9.1 One-time setup

**Account and visibility.** The repo lives on the developer's own GitHub account, `FabianHaxhiaj22` (`https://github.com/FabianHaxhiaj22/tonematch`). It is **public** (portfolio project, and branch protection and secret scanning are free on public repos) but has **no open-source licence**: all rights reserved. There is no `LICENSE` file, and `package.json` has `"private": true` and `"license": "UNLICENSED"`. See `docs/DECISIONS.md`. **Every repo setting (branch protection, secrets, Dependabot, security features, release-please) is documented in `docs/REPO_SETUP.md`**; keep it in sync whenever a setting changes.

**Developers.** The owner (`FabianHaxhiaj22`, admin) and collaborators with the **write** role (currently `tolaerdiona-commits`) work through branches and PRs; branch protection applies to everyone, admins included. New developers: start with `docs/ONBOARDING.md`. Collaborators and roles are recorded in `docs/REPO_SETUP.md`.

**Rules for Claude Code:**
- **Never change the global git config.** Set `user.name` and `user.email` for this repo only (`git config --local`), using the **developer's own** GitHub noreply address (`<id>+<login>@users.noreply.github.com`).
- **Before any command that touches GitHub**, run `gh auth status` and `gh api user --jq .login`. The active account must be **the developer working on this machine**, and one of the authors listed in §18. If it isn't, stop and tell the user to run `gh auth switch --hostname github.com --user <their-login>` (or `gh auth login`). Never act on GitHub with someone else's account.
- **Repo settings** (branch protection, secrets, collaborators, merge and security settings) are changed only from the **owner's** account, and only when the owner asks. Record every change in `docs/REPO_SETUP.md`.
- **Show the user the repo URL and `git remote -v` before the first push**, so they can check the owner.
- **Never write tokens or credentials into any file in the repo.** Secrets are entered by the user, in GitHub's UI or at `gh secret set`'s interactive prompt.

```bash
# prerequisites: git, gh (GitHub CLI), Node 24 via nvm, pnpm via corepack
# User, once, interactively. Protocol HTTPS; "authenticate Git with your GitHub credentials": Yes
# (this adds gh as the credential helper in ~/.gitconfig; it sets no global identity).
gh auth login
gh auth status && gh api user --jq .login        # must print FabianHaxhiaj22

git init -b main
git config --local user.name  "Fabian Haxhiaj"
git config --local user.email "187953086+FabianHaxhiaj22@users.noreply.github.com"

gh repo create FabianHaxhiaj22/tonematch --public --source=. --remote=origin
gh repo view FabianHaxhiaj22/tonematch --json url --jq .url
git remote -v                                    # user confirms the owner before the push
# user creates RELEASE_PLEASE_TOKEN and adds it as a repo secret (see below) before the first push
git add . && git commit -m "chore: initial scaffold"
git push -u origin main
gh api repos/FabianHaxhiaj22/tonematch --jq .permissions.admin   # must be true before branch protection
```
Then (Claude Code via `gh api`, after the admin check; each setting is recorded in `docs/REPO_SETUP.md`):
- **Merge settings:** squash-merge only, delete branches after merge.
- **Branch protection on `main`:** require PR, require CI and PR-title checks to pass, no force-push, no deletion, linear history.
- Enable **Dependabot alerts + security updates**, **secret scanning** and **push protection**.
- **`RELEASE_PLEASE_TOKEN`** (see §9.4): a fine-grained PAT created by the owner, limited to this repo only, with the minimum permissions (Contents, Issues and Pull requests: read & write; Metadata: read). The user adds it as a repo secret.
- Add repo secret `ANTHROPIC_API_KEY` only when Phase 2 starts (and in Vercel env vars, not in code).

### 9.2 Branching
- `main` is always deployable.
- Feature branches: `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>`.
- One feature = one branch = one PR. Squash-merge.

### 9.3 Commits (Conventional Commits, enforced by commitlint)
`feat: add white-paper calibration` · `fix: cheek mask excluding too many pixels` · `test: add Lab conversion fixtures` · `docs: update calibration results` · `chore(deps): bump next`

**Co-authored work** (rule since 2026-11-13): when a PR is done by **both** authors (§18), every commit in it **and the squash commit** end with a `Co-authored-by:` trailer for whichever author isn't that commit's author:
```
Co-authored-by: Erdiona Tola <353759092+tolaerdiona-commits@users.noreply.github.com>
Co-authored-by: Fabian Haxhiaj <187953086+FabianHaxhiaj22@users.noreply.github.com>
```
Work done by only one of us gets no human co-author trailer. **Never rewrite existing history** to add or remove trailers. (AI-assistance trailers, e.g. Claude Code's, are separate from this rule.) How-to: `docs/ONBOARDING.md`.

### 9.4 Versioning & releases
- **SemVer.** `0.x` until the MVP ships, `1.0.0` at the public MVP launch.
- **release-please** GitHub Action reads Conventional Commits, opens a release PR, bumps `package.json`, updates `CHANGELOG.md`, and creates a git tag + GitHub Release on merge.
- release-please runs with the `RELEASE_PLEASE_TOKEN` secret, not the default `GITHUB_TOKEN`. PRs opened with `GITHUB_TOKEN` don't trigger other workflows, so the release PR would never get the CI checks that branch protection requires.
- Because PRs are squash-merged, the **PR title** becomes the commit message on `main`. PR titles are therefore checked as Conventional Commits in CI (§9.5); commitlint in Husky only covers local commits.

### 9.5 CI (`.github/workflows/ci.yml`), on every PR and push to main
1. Checkout → setup Node from `.nvmrc` → pnpm install with cache (frozen lockfile)
2. `pnpm lint` → `pnpm typecheck` → `pnpm validate:data`
3. `pnpm test` (Vitest, with coverage; fail if `src/lib/**` coverage < 90%)
4. `pnpm build`
5. Playwright e2e against the built app (Chromium; add WebKit for mobile Safari later)
6. Upload Playwright report as artifact on failure

Separately, `.github/workflows/pr-title.yml` runs on every PR (opened, edited, synchronised) and fails if the PR title is not a valid Conventional Commit.

### 9.6 Dependabot
Weekly npm + GitHub Actions updates, grouped (minor/patch together), separate PRs for majors.

---

## 10. Deployment

### Option A: Vercel (default, fastest)
- Import the GitHub repo in Vercel → automatic **preview deploy per PR** + production deploy on `main`.
- Set Node version to match `.nvmrc` in project settings.
- Env vars in the Vercel dashboard.

### Option B: AWS (more cloud-portfolio value)
- Since analysis is client-side, almost everything is static. Two paths:
  - **AWS Amplify Hosting** (supports Next.js SSR), connected to GitHub, or
  - **Static export** (`output: 'export'`) to **S3 + CloudFront**, with the `/api/explain` endpoint as a **Lambda Function URL or API Gateway + Lambda**, infra defined with **AWS CDK (TypeScript)** or Terraform in `/infra`.
- Include budget alarms, CloudFront security headers policy, and OIDC GitHub → AWS deploy role (no long-lived keys).
- Claude Code: only do Option B if the user asks; document it in `docs/DECISIONS.md`.

---

## 11. Testing strategy

- **Unit (Vitest):** colour conversions, ITA/hue, depth mapping, undertone fusion, confidence, rules engine. Table-driven tests.
- **Synthetic fixtures:** do **not** scrape real faces from the internet. Generate test images programmatically (solid skin-coloured patches with known Lab values, gradients, colour-cast versions). For the landmark pipeline, use **openly licensed** face images only (check licence, record source in `tests/fixtures/SOURCES.md`) or images the user provides with consent.
- **Calibration set (manual, outside CI):** the user collects consenting volunteers' results (photo stays on device; only record numbers + self-reported undertone) to tune thresholds. Log results in `docs/CALIBRATION.md`.
- **E2E (Playwright):** upload fixture → quiz → results; camera permission denied path; quality-gate warnings; locale switch; share card download.
- **Accessibility:** `@axe-core/playwright` on every page.
- **Performance:** Lighthouse CI budget (LCP < 2.5 s on landing, model lazy-loaded only on `/analyze`).

---

## 12. Security, privacy & legal

- **No image upload.** Enforce with a Content Security Policy (`connect-src 'self'` plus only the APIs actually used); the worker and model are same-origin.
- Strip nothing because nothing is uploaded. Still, never write image data to logs, analytics, or storage.
- `/api/explain` (Phase 2): Zod-validate the payload (numbers + enums only, reject anything else), rate-limit per IP, cap tokens, timeout, no logging of payloads.
- Secrets only in env vars; `.env.example` lists names without values; `.env*` in `.gitignore`.
- Security headers: CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, HSTS.
- `Permissions-Policy` sets `camera=(self)` **site-wide** (this still blocks third-party frames), and turns off unused features (microphone, geolocation, etc.). Don't restrict the camera per route: App Router navigations don't reload the document, so a stricter policy from the landing page would still apply on `/analyze` and block the camera. Only the `/analyze` code ever requests the camera.
- **Privacy notice page** (`/privacy`, en + sq) explaining on-device processing in plain language. Reference Albania Law No. 124/2024 and GDPR. If accounts or saved results are added (Phase 3), add consent, data export, and deletion. **Have the final privacy text reviewed by someone qualified before a public launch.** Claude Code must not present generated legal text as legal advice.
- Camera consent: explicit button, clear explanation, works fully without the camera (upload path).
- Disclaimer on results: "Style guidance based on colour analysis. Lighting and cameras affect results."

---

## 13. UX, accessibility & i18n

- Flow: Landing → Guide → Capture/Upload → (Calibrate?) → Quiz (4 taps) → Results → Share.
- Progress indicator across steps; every step skippable back.
- Results are visual: skin swatch next to metal swatches; tier badges; short reasons.
- All text in `src/i18n/messages/en.json` and `src/i18n/messages/sq.json`. No hard-coded strings. Albanian copy should be reviewed by a native speaker (the user).
- WCAG 2.2 AA: contrast, focus states, keyboard nav, alt text, `aria-live` for analysis status, reduced motion.
- Aesthetic: elegant, jewellery-brand feel (serif display font + clean sans body, warm-neutral palette, subtle metallic gradients). Avoid generic template look.

---

## 14. Build plan (phases & milestones)

Claude Code works through these in order. Each milestone = its own branch + PR + green CI.

| # | Milestone | Done when |
|---|---|---|
| M0 | Repo + tooling | Scaffold, pinned versions, lint/format/hooks, CI green, CLAUDE.md, docs/ stubs, pushed to GitHub with branch protection |
| M1 | Colour engine | `src/lib/color` + tests ≥ 90% coverage |
| M2 | Landmarker in worker | Face detected from an uploaded image; debug overlay of landmarks and sampled regions (dev-only route) |
| M3 | Sampling + quality gate | Region medians, filters, quality issues surfaced in UI |
| M4 | Undertone/depth + quiz + fusion | Scores + confidence; unit tested |
| M5 | Recommendation engine + data | JSON data validated; rules tested |
| M6 | Results UI + share card | Polished results page, PNG card |
| M7 | Camera capture + calibration | Live camera, white-paper tap calibration |
| M8 | i18n, a11y, privacy page, SEO | Albanian + English, axe clean, metadata/OG tags |
| M9 | Deploy + v1.0.0 | Production on Vercel (or AWS), release-please tag |
| P2 | Face shape, try-on, AI explanation, multi-photo | Each as its own milestone |
| P3 | Catalogue, affiliate, widget, gift mode, accounts | Each as its own milestone |

---

## 15. Working rules for Claude Code

1. **Read this README first** every session. Keep `CLAUDE.md` short and in sync.
2. **Plan before coding:** for each milestone, write a short plan (files to touch, tests to add) and show it to the user before starting large changes.
3. **Small PRs.** One milestone or sub-feature per branch. Conventional Commit messages. Never push directly to `main` after M0.
4. **Tests with every feature.** Pure logic in `src/lib` must be tested. Don't mark a milestone done with failing or skipped tests.
5. **Verify, don't assume:** check package versions with `npm view`, read official docs for MediaPipe/Next.js/Tailwind APIs when unsure, and say when something is a guess.
6. **No secrets in code or commits.** No real face images in the repo without documented licence/consent.
7. **Never send or store images server-side.** If a feature seems to need it, stop and ask the user.
8. **Thresholds live in config** with comments; never magic numbers in logic.
9. **Record decisions** in `docs/DECISIONS.md` (date, decision, why, alternatives).
10. **After each milestone:** run lint, typecheck, tests, build; update README/docs if behaviour changed; summarise what changed and what's next.
11. **Ask the user** before: adding a paid service, changing the stack, adding a database, or anything touching privacy/legal.
12. **Co-authored work:** when a PR is done by both authors, every commit and the squash commit end with a `Co-authored-by:` trailer for the author who didn't make that commit (§9.3). Not for single-author work. Never rewrite history.
13. **Act as the developer at this machine:** GitHub actions use that developer's own `gh` account and repo-local identity; repo settings only from the owner's account (§9.1).

---

## 16. Environment variables (`.env.example`)

```bash
# Phase 2 — AI explanation (server only, never NEXT_PUBLIC_)
ANTHROPIC_API_KEY=
EXPLAIN_MODEL=claude-haiku-5-5       # verify current model IDs at docs.claude.com
EXPLAIN_RATE_LIMIT_PER_MIN=5

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_PROVIDER=none  # none | vercel | plausible

# Phase 3
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## 17. Scripts (expected in `package.json`)

| Script | Purpose |
|---|---|
| `dev` | Runs `models:fetch`, then the Next dev server (Turbopack) |
| `build` / `start` | Runs `models:fetch`, then the production build / serve |
| `lint` / `format` | ESLint / Prettier |
| `typecheck` | `tsc --noEmit` |
| `test` / `test:watch` / `test:coverage` | Vitest |
| `e2e` | Playwright |
| `validate:data` | Zod-validate `src/data/*.json` |
| `models:fetch` | Copy the MediaPipe WASM files from the pinned `@mediapipe/tasks-vision` package in `node_modules` into `public/models`, download only `face_landmarker.task` from a pinned (versioned) URL, and verify SHA-256 checksums. Skips work when the files already match. `public/models/` is gitignored. |

---

## 18. Authors

| Name | GitHub | Role |
|---|---|---|
| Fabian Haxhiaj | [@FabianHaxhiaj22](https://github.com/FabianHaxhiaj22) | Owner, co-developer |
| Erdiona Tola | [@tolaerdiona-commits](https://github.com/tolaerdiona-commits) | Co-developer |

Commits use each author's GitHub noreply address; shared work carries `Co-authored-by` trailers (§9.3). All rights reserved (§9.1): no licence is granted by this repository.
