# Pinned versions

Checked with `npm view <package> version` on **2026-11-07**. All versions in `package.json` are exact (no `^`, `~`, `latest` or `*`). Update this file whenever a dependency is added or bumped.

## Toolchain

| Tool | Version | Notes |
|---|---|---|
| Node.js | 24.x (`.nvmrc`: `24`), dev machine 24.22.2 | `engines.node: ">=24.15.0 <25"` (jsdom 31 needs ≥ 24.15). Node 26 is LTS since 2026-10-28; stay on 24 until the deploy platform is confirmed. |
| pnpm | 12.18.0 | Pinned via `packageManager`; enabled with `corepack enable pnpm` (corepack ships with Node 24, not 25+). Settings live in `pnpm-workspace.yaml`. |

## Installed in M0

| Package | Pinned | Latest on 2026-11-07 | Notes |
|---|---|---|---|
| next | 16.4.5 | 16.4.5 | |
| react / react-dom | 19.3.1 | 19.3.1 | |
| typescript | 5.9.3 | **7.0.2** | Held back: typescript-eslint 8.72 supports TS `<6.1`. TS 6.0.3 is possible; owner chose to stay on 5.9.3 for now. See DECISIONS.md D-012. |
| tailwindcss / @tailwindcss/turbopack | 4.3.5 | 4.3.5 | Next 16's template uses the Turbopack loader, not PostCSS. |
| eslint | 9.39.5 | **10.14.0** | Held back: eslint-plugin-jsx-a11y 6.10.2 supports ESLint ≤ 9. |
| eslint-config-next | 16.4.5 | 16.4.5 | |
| eslint-plugin-jsx-a11y | 6.10.2 | 6.10.2 | |
| eslint-config-prettier | 10.1.8 | 10.1.8 | |
| prettier | 3.9.10 | 3.9.10 | |
| vitest / @vitest/coverage-v8 | 5.1.0 | 5.1.0 | |
| vite | 8.3.6 | 8.3.6 | Peer of vitest and @vitejs/plugin-react. |
| @vitejs/plugin-react | 6.2.1 | 6.2.1 | |
| @testing-library/react | 16.3.3 | 16.3.3 | |
| @testing-library/dom | 10.4.2 | 10.4.2 | |
| @testing-library/jest-dom | 7.0.1 | 7.0.1 | |
| jsdom | 31.0.0 | 31.0.0 | |
| @playwright/test | 1.65.0 | 1.65.0 | |
| @axe-core/playwright | 4.14.0 | 4.14.0 | |
| husky | 9.1.7 | 9.1.7 | |
| lint-staged | 17.6.0 | 17.6.0 | |
| @commitlint/cli / config-conventional | 21.2.4 | 21.2.4 | |
| zod | 4.6.7 | 4.6.7 | |
| @mediapipe/tasks-vision | 1.2.2 | 1.2.2 | WASM checksums in `scripts/models.lock.json`. |
| tsx | 4.23.15 | 4.23.15 | Runs `scripts/*.ts`. |
| @types/node | 24.19.2 | 26.6.6 | Matches the Node 24 runtime. |
| @types/react / @types/react-dom | 19.3.0 | 19.3.0 | |

## Self-hosted model

| File | Source | Size | SHA-256 |
|---|---|---|---|
| `face_landmarker.task` | `storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/` | 3,758,596 B | `64184e22…0bc9ff` (full hash in `scripts/models.lock.json`; cross-checked against the storage MD5 on first download) |

## GitHub Actions (pinned to commit SHAs)

| Action | Version |
|---|---|
| actions/checkout | v7.0.1 |
| actions/setup-node | v7.1.0 |
| actions/cache | v6.1.0 |
| actions/upload-artifact | v7.0.2 |
| amannn/action-semantic-pull-request | v6.1.2 |
| googleapis/release-please-action | v5.0.0 |

## Planned (installed in the milestone that needs them)

| Package | Latest on 2026-11-07 | Milestone |
|---|---|---|
| culori | 4.0.2 | M1 (test cross-checks) |
| zustand | 5.1.0 | M4 |
| shadcn (CLI) | 4.23.0 | M6 |
| motion | 14.10.1 | M6 |
| next-intl | 4.14.9 | M8 |
| @anthropic-ai/sdk | 1.6.0 | Phase 2 |
