# CLAUDE.md

**README.md is the source of truth.** Read it fully at the start of every session.
This file only summarises the working rules (README §15). If they conflict, README wins.
Keep this file short (< 60 lines) and in sync with README §15.

`PROMPTS.md` is the user's private list of future prompts. Do not act on it.

## Project in one line
ToneMatch: a Next.js web app that analyses skin tone and undertone from a selfie,
**entirely in the browser**, and recommends jewellery metals, styles and gemstones.

## Working rules
1. **Read README.md first**, every session. Follow the milestone order in README §14.
   Don't jump ahead to a later milestone.
2. **Plan before coding.** For each milestone, show the user a short plan
   (files to touch, tests to add) before starting large changes.
3. **Small PRs.** One milestone or sub-feature per branch
   (`feat/`, `fix/`, `chore/`, `docs/`). Use Conventional Commits and squash-merge.
   Never push directly to `main` after M0.
4. **Tests with every feature.** Pure logic in `src/lib` must be tested
   (coverage ≥ 90% on `src/lib/**`). A milestone is not done while any test
   fails or is skipped.
5. **Verify, don't assume.** Check versions with `npm view`, pin exact versions,
   and record them in `docs/VERSIONS.md`. Read the official docs for MediaPipe,
   Next.js, Tailwind and similar APIs when unsure. Say when something is a guess.
   For Next.js, read the version-matched docs in `node_modules/next/dist/docs/` (see AGENTS.md).
6. **No secrets** in code or commits (env vars only; `.env.example` holds names
   without values). No real face images in the repo unless their licence or
   consent is recorded in `tests/fixtures/SOURCES.md`.
7. **Never send or store images server-side.** Only numeric results may leave the
   browser, and only for the opt-in AI explanation. If a feature seems to need
   the image on a server, stop and ask the user.
8. **Thresholds live in config** (`src/lib/analysis/config.ts`) as named,
   commented constants. No magic numbers in logic.
9. **Record decisions** in `docs/DECISIONS.md` (date, decision, why, alternatives).
10. **After each milestone:** run lint, typecheck, tests and build; update README
    and docs if behaviour changed; summarise what changed and what comes next.
11. **Ask the user before:** adding a paid service, changing the stack, adding a
    database, or anything that touches privacy or legal text. Never present
    generated legal text as legal advice.

## Non-negotiables (details in the README)
- Never infer, label or store race or ethnicity (§1).
- Present results as style guidance with a confidence score, never as a
  measurement of the person (§1, §2).
- Use the Monk Skin Tone scale, not Fitzpatrick (§2). Label MST values as approximate.
- No hard-coded UI strings: everything goes in the `en` and `sq` message files (§13).
- Target WCAG 2.2 AA and respect `prefers-reduced-motion` (§13).
- GitHub (§9.1): never change the global git config; `git config --local` only, with the
  developer's own noreply email. Before any GitHub action, confirm the active `gh` account is
  the developer at this machine (an author in §18); if not, stop and ask. Repo settings: owner
  only, recorded in `docs/REPO_SETUP.md`. Never write tokens or credentials to any file.
- Shared PRs (§9.3): every commit + the squash commit get `Co-authored-by:` for the other
  author. Not for single-author work. Never rewrite history. New devs: `docs/ONBOARDING.md`.

## Key commands (README §17)
`pnpm dev` · `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm validate:data`
· `pnpm build` · `pnpm e2e` · `pnpm models:fetch`
