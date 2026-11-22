# Repository setup

Every GitHub setting for this repo, so it can be audited or recreated (SPEC §9.1). **No secret values are ever written here**, only names, scopes and dates. Update this file in the same PR as any settings change.

- **Repo:** `FabianHaxhiaj22/tonematch`
- **Status:** Applied and verified on **2026-11-07** with the commands in "Verify" (repo created, first push of the initial scaffold, now `bd0aea0` after the rewrite, CI green, then branch protection on). **2026-11-22:** after the one-time history rewrite, the repo moved (DECISIONS.md D-031). The old repo is now the private `FabianHaxhiaj22/tonematch-archive` (no protection: unavailable on GitHub Free for private repos). This file describes the **new public** `FabianHaxhiaj22/tonematch`, set up from scratch with the settings below and verified with the commands in "Verify".

## Account and visibility

| Setting | Value |
|---|---|
| Owner | `FabianHaxhiaj22` (the owner's own account) |
| Visibility | Public (new repo since 2026-11-22; the old one is the private `tonematch-archive`, D-001, D-031) |
| Licence | None: all rights reserved (`"license": "UNLICENSED"`). See DECISIONS.md D-001. |
| Default branch | `main` |

## Collaborators

| Login | Name | GitHub id | Role | Since | Checked |
|---|---|---|---|---|---|
| `FabianHaxhiaj22` | Fabian Haxhiaj | 187953086 | **admin** (owner) | 2026-11-07 (new repo: 2026-11-22) | 2026-11-22 |
| `tolaerdiona-commits` | Erdiona Tola | 353759092 | **write** (push, triage, pull; no admin/maintain) | invited to the new repo 2026-11-22, accepted 2026-11-22 | 2026-11-22 (`write`, no pending invitations) |

- Branch protection applies to **both** (`enforce_admins: true`): PRs only, required checks, squash-merge.
- Only the owner changes repo settings, roles or secrets. In the old repo, roles were checked, not changed, on 2026-11-13 (DECISIONS.md D-018); in the new repo Erdiona was re-invited with the same role.

## Local git config (per developer, this repo only, `git config --local`)

Each developer sets their **own** identity on their own machine: `user.name` and their own GitHub **noreply** `user.email`, both listed in `docs/ONBOARDING.md` §4. Nobody changes their global git config for this repo.

`core.hooksPath` = `.husky/_` (set by `husky` on `pnpm install`). Credentials come from each developer's own `gh auth login` ("authenticate Git: Yes" adds gh as the credential helper in their `~/.gitconfig`; it sets no identity).

## Commit conventions

- Conventional Commits; PR titles are checked by `pr-title` because the squash commit takes the PR title.
- **Co-author rule** (from 2026-11-22, D-032; before that, shared PRs only): every commit and every squash merge ends with `Co-authored-by:` for the other developer (exact trailers in `docs/ONBOARDING.md` §8), with no exceptions; merges pass it with `gh pr merge --squash --body "Co-authored-by: …"`; bot PRs (Dependabot, release-please) get **both** trailers. Nobody credits themselves, except on release-please PRs, whose GitHub author is the owner because they're opened with his token. Never rewrite existing history (one-time exception on 2026-11-19: DECISIONS.md D-031). See SPEC §9.3 and `docs/ONBOARDING.md` §8.
- **No AI co-author trailers:** `.claude/settings.json` (committed) sets Claude Code's `attribution` to `{"commit": "", "pr": "", "sessionUrl": false}`. Personal overrides go in `.claude/settings.local.json` (gitignored).
- **Commit email for web merges:** GitHub uses each developer's account commit email for squash merges made in the web UI or with `gh pr merge`. Both developers keep "Keep my email addresses private" on (GitHub → Settings → Emails), so those commits get the noreply address.

## Merge settings

| Setting | Value | Why |
|---|---|---|
| Squash merge | On | One feature = one commit on `main`; PR title becomes the commit message |
| Merge commits | Off | Linear history |
| Rebase merge | Off | One merge method keeps release-please input predictable |
| Delete branch on merge | On | Tidy branches |
| Squash commit title / message | PR title (or the commit's, for one commit) / commit messages (GitHub defaults) | Keeps `Co-authored-by:` lines from the PR's commits in the squash message |
| Wiki | Off | Docs live in the repo |

## Branch protection: `main`

| Rule | Value | Why |
|---|---|---|
| Require PR before merging | On, **0** approvals | Single developer; GitHub doesn't let you approve your own PR |
| Required status checks | `ci`, `pr-title` | CI must pass; PR title must be a Conventional Commit |
| Require branch up to date (`strict`) | On | Checks run against the latest `main` |
| Enforce for admins | **On** | Nobody pushes directly to `main` after M0 (SPEC §15 rule 3) |
| Require linear history | On | Matches squash-only |
| Allow force pushes | Off | |
| Allow deletions | Off | |
| Require conversation resolution | On | |

**New repo: applied and verified on 2026-11-22**, with the command below, after `ci` and `pr-title` had passed on #18 (Actions had to be enabled first, see "GitHub Actions"). Read back with `gh api repos/$R/branches/main/protection`: checks `ci` + `pr-title`, strict, `enforce_admins`, 0 approvals, linear history, conversation resolution, no force pushes or deletions.

Applied with:
```bash
gh api -X PUT repos/FabianHaxhiaj22/tonematch/branches/main/protection --input - <<'EOF'
{"required_status_checks":{"strict":true,"contexts":["ci","pr-title"]},
 "enforce_admins":true,
 "required_pull_request_reviews":{"required_approving_review_count":0},
 "restrictions":null,"required_linear_history":true,
 "allow_force_pushes":false,"allow_deletions":false,"required_conversation_resolution":true}
EOF
```

## GitHub Actions

| Setting | Value | Why |
|---|---|---|
| Default `GITHUB_TOKEN` permissions | Read-only | Each workflow declares the permissions it needs |
| Allow Actions to create/approve PRs | Off | release-please uses its own PAT instead |
| Approval for fork PR workflows | **All external contributors** (`all_external_contributors`) | A maintainer approves every outside contributor's workflow runs; fork PRs never get secrets or a write token anyway |
| Third-party actions | Pinned to full commit SHAs | Dependabot (`github-actions`) proposes updates |

Workflows: `ci.yml` (job `ci`), `pr-title.yml` (job `pr-title`), `release.yml` (job `release-please`).

**New repo, 2026-11-22: Actions had to be enabled by hand.** After the first push no workflow ran (no check suites for pushes or PRs; only Dependabot's own jobs), although the API reported `enabled: true`, `allowed_actions: all` and all three workflows as `active`. The repo's Actions tab showed "Workflows aren't being run on this repository — GitHub Actions is not currently enabled". The owner clicked **Enable Actions on this repository**; after that, closing and reopening #18 started CI and PR title. If this ever happens again (e.g. a re-created repo), check the Actions tab first: the API doesn't show this state.

## Security

| Feature | Value |
|---|---|
| Dependabot alerts | On (checked 2026-11-22) |
| Dependabot security updates | On (checked 2026-11-22) |
| Secret scanning | On (checked 2026-11-22) |
| Push protection | On (checked 2026-11-22) |

Before the new repo was published, a read-only audit of all history, branches, tags and PR/issue text found no secrets or credentials (D-031).

## Dependabot version updates (`.github/dependabot.yml`)

- **npm:** weekly (Monday); minor and patch updates grouped into one PR, majors as separate PRs; commit prefix `chore(deps)`.
- **Ignored majors** (DECISIONS.md D-012): `typescript` (stay on 5.x until typescript-eslint supports newer), `eslint` (stay on 9 until jsx-a11y supports 10), `@types/node` (must match Node 24). Remove a rule when its reason is gone.

## Dismissed security alerts

| Alert | Package | Dismissed | Reason | Recheck |
|---|---|---|---|---|
| #1 GHSA-g3hv-75wg-m249 (medium) | `minimatch@10.2.6` (via typescript-eslint) | Old repo: 2026-11-07, `tolerable_risk`. **New repo: open again as alert #1** (dismissals don't carry over) | Dev-only, lint-time; fix needs a major typescript-eslint doesn't accept yet | When typescript-eslint updates its `minimatch` range (DECISIONS.md R-005) |
- **GitHub Actions:** weekly (Monday); minor and patch grouped; commit prefix `ci(deps)`.

## Secrets

| Name | Purpose | Type and scope | Permissions | Created | Expires | Rotation |
|---|---|---|---|---|---|---|
| `RELEASE_PLEASE_TOKEN` | Lets release-please open PRs that trigger CI | Fine-grained PAT `tonematch-release-pl1`, owner `FabianHaxhiaj22`, **this repo only** (the new `tonematch`) | Contents RW, Issues RW, Pull requests RW, Metadata R | 2026-11-22 (replaces the old repo's token from 2026-11-07, to be deleted) | **2027-02-20** (rotate before this date) | Generate a new token with the same settings, run `gh secret set RELEASE_PLEASE_TOKEN --repo FabianHaxhiaj22/tonematch`, paste at the prompt, then delete the old token |
| `ANTHROPIC_API_KEY` | Phase 2 AI explanation | Not created yet | | | | Add only when Phase 2 starts (also in Vercel env vars) |

## release-please

- Config: `release-please-config.json` (release type `node`, `bump-minor-pre-major`, `initial-version: 0.1.0`), state: `.release-please-manifest.json` (starts at `0.0.0`).
- `initial-version` matters: with a `0.0.0` manifest, release-please treats the project as never released and otherwise proposes **1.0.0** as the first version (it did, in #6). The first release must be `0.1.0`.
- On every push to `main` it opens or updates a release PR. Merging that PR bumps `package.json`, updates `CHANGELOG.md`, tags `vX.Y.Z` and creates a GitHub Release.
- **History rewrite and move (D-031):** `v0.1.0` points to the rewritten release commit `2d0dece`; in the new repo the v0.1.0 Release was recreated with corrected notes. The archive's release PR #17 isn't carried over: release-please opens a fresh one in the new repo on the first push to `main` (once its token is set).
- SemVer: `0.x` until the public MVP, `1.0.0` at launch (SPEC §9.4).

## Verify current settings

```bash
R=FabianHaxhiaj22/tonematch
gh repo view $R --json visibility,defaultBranchRef,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge
gh api repos/$R/branches/main/protection \
  --jq '{checks:.required_status_checks.contexts,strict:.required_status_checks.strict,admins:.enforce_admins.enabled,linear:.required_linear_history.enabled,force:.allow_force_pushes.enabled,reviews:.required_pull_request_reviews.required_approving_review_count}'
gh api repos/$R/actions/permissions/workflow
gh api repos/$R/actions/permissions/fork-pr-contributor-approval   # all_external_contributors
gh api repos/$R --jq .security_and_analysis
gh api repos/$R/vulnerability-alerts -i 2>&1 | head -1     # 204 = alerts enabled
gh api repos/$R/automated-security-fixes                   # enabled: true
gh secret list --repo $R                                   # names only
gh api repos/$R/collaborators --jq '.[] | "\(.login) \(.role_name)"'   # roles
gh api repos/$R/invitations --jq '.[].invitee.login'                    # pending invitations
```
