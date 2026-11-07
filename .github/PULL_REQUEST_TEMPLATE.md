<!-- PR title must be a Conventional Commit, e.g. "feat: add white-paper calibration". It becomes the squash commit on main. -->

## What & why

<!-- One or two sentences. Link the milestone (README §14) or issue. -->

## How it was tested

<!-- Unit tests, e2e, manual steps. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass locally
- [ ] Tests added/updated for new logic (`src/lib` keeps ≥ 90% coverage)
- [ ] No images or image data sent to a server, logged, or stored (README §2, §12)
- [ ] No secrets, and no real face images without documented licence/consent
- [ ] Thresholds live in config, not as magic numbers
- [ ] UI text goes through the `en`/`sq` message files (from M8 onwards)
- [ ] Docs updated if behaviour changed (README, `docs/DECISIONS.md`, `docs/REPO_SETUP.md`)
