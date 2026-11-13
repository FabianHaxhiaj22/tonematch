# Repository setup

Every GitHub setting for this repo, so it can be audited or recreated (README §9.1). **No secret values are ever written here**, only names, scopes and dates. Update this file in the same PR as any settings change.

- **Repo:** `FabianHaxhiaj22/tonematch`
- **Status:** Applied and verified on **2026-11-07** with the commands in "Verify" (repo created, first push `c96e9df`, CI green, then branch protection on).

## Account and visibility

| Setting | Value |
|---|---|
| Owner | `FabianHaxhiaj22` (the owner's own account) |
| Visibility | Public |
| Licence | None: all rights reserved (`"license": "UNLICENSED"`). See DECISIONS.md D-001. |
| Default branch | `main` |

## Collaborators

| Login | Name | GitHub id | Role | Since | Checked |
|---|---|---|---|---|---|
| `FabianHaxhiaj22` | Fabian Haxhiaj | 187953086 | **admin** (owner) | 2026-11-07 | 2026-11-13 |
| `tolaerdiona-commits` | Erdiona Tola | 353759092 | **write** (push, triage, pull; no admin/maintain) | before 2026-11-13 (invited by owner) | 2026-11-13 |

- Branch protection applies to **both** (`enforce_admins: true`): PRs only, required checks, squash-merge.
- Only the owner changes repo settings, roles or secrets. Roles were checked, not changed, on 2026-11-13 (DECISIONS.md D-018).

## Local git config (per developer, this repo only, `git config --local`)

Each developer sets their **own** identity on their own machine (`docs/ONBOARDING.md` §4). Nobody changes their global git config for this repo.

| Developer | `user.name` | `user.email` (GitHub noreply) |
|---|---|---|
| Fabian | `Fabian Haxhiaj` | `187953086+FabianHaxhiaj22@users.noreply.github.com` |
| Erdiona | `Erdiona Tola` | `353759092+tolaerdiona-commits@users.noreply.github.com` |

`core.hooksPath` = `.husky/_` (set by `husky` on `pnpm install`). Credentials come from each developer's own `gh auth login` ("authenticate Git: Yes" adds gh as the credential helper in their `~/.gitconfig`; it sets no identity).

## Commit conventions

- Conventional Commits; PR titles are checked by `pr-title` because the squash commit takes the PR title.
- **Co-author rule** (from 2026-11-13): when a PR is done by both developers, every commit and the squash commit end with `Co-authored-by:` for the developer who isn't that commit's author (addresses in the table above). Single-author work: no human co-author trailer. Never rewrite existing history. See README §9.3 and `docs/ONBOARDING.md` §8.

## Merge settings

| Setting | Value | Why |
|---|---|---|
| Squash merge | On | One feature = one commit on `main`; PR title becomes the commit message |
| Merge commits | Off | Linear history |
| Rebase merge | Off | One merge method keeps release-please input predictable |
| Delete branch on merge | On | Tidy branches |

## Branch protection: `main`

| Rule | Value | Why |
|---|---|---|
| Require PR before merging | On, **0** approvals | Single developer; GitHub doesn't let you approve your own PR |
| Required status checks | `ci`, `pr-title` | CI must pass; PR title must be a Conventional Commit |
| Require branch up to date (`strict`) | On | Checks run against the latest `main` |
| Enforce for admins | **On** | Nobody pushes directly to `main` after M0 (README §15 rule 3) |
| Require linear history | On | Matches squash-only |
| Allow force pushes | Off | |
| Allow deletions | Off | |
| Require conversation resolution | On | |

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
| Third-party actions | Pinned to full commit SHAs | Dependabot (`github-actions`) proposes updates |

Workflows: `ci.yml` (job `ci`), `pr-title.yml` (job `pr-title`), `release.yml` (job `release-please`).

## Security

| Feature | Value |
|---|---|
| Dependabot alerts | On |
| Dependabot security updates | On |
| Secret scanning | On |
| Push protection | On |

## Dependabot version updates (`.github/dependabot.yml`)

- **npm:** weekly (Monday); minor and patch updates grouped into one PR, majors as separate PRs; commit prefix `chore(deps)`.
- **Ignored majors** (DECISIONS.md D-012): `typescript` (stay on 5.x until typescript-eslint supports newer), `eslint` (stay on 9 until jsx-a11y supports 10), `@types/node` (must match Node 24). Remove a rule when its reason is gone.

## Dismissed security alerts

| Alert | Package | Dismissed | Reason | Recheck |
|---|---|---|---|---|
| #1 GHSA-g3hv-75wg-m249 (medium) | `minimatch@10.2.6` (via typescript-eslint) | 2026-11-07, `tolerable_risk` | Dev-only, lint-time; fix needs a major typescript-eslint doesn't accept yet | When typescript-eslint updates its `minimatch` range (DECISIONS.md R-005) |
- **GitHub Actions:** weekly (Monday); minor and patch grouped; commit prefix `ci(deps)`.

## Secrets

| Name | Purpose | Type and scope | Permissions | Created | Expires | Rotation |
|---|---|---|---|---|---|---|
| `RELEASE_PLEASE_TOKEN` | Lets release-please open PRs that trigger CI | Fine-grained PAT, owner `FabianHaxhiaj22`, **this repo only** | Contents RW, Issues RW, Pull requests RW, Metadata R | 2026-11-07 | **2027-02-05** (rotate before this date) | Generate a new token with the same settings, run `gh secret set RELEASE_PLEASE_TOKEN --repo FabianHaxhiaj22/tonematch`, paste at the prompt, then delete the old token |
| `ANTHROPIC_API_KEY` | Phase 2 AI explanation | Not created yet | | | | Add only when Phase 2 starts (also in Vercel env vars) |

## release-please

- Config: `release-please-config.json` (release type `node`, `bump-minor-pre-major`, `initial-version: 0.1.0`), state: `.release-please-manifest.json` (starts at `0.0.0`).
- `initial-version` matters: with a `0.0.0` manifest, release-please treats the project as never released and otherwise proposes **1.0.0** as the first version (it did, in #6). The first release must be `0.1.0`.
- On every push to `main` it opens or updates a release PR. Merging that PR bumps `package.json`, updates `CHANGELOG.md`, tags `vX.Y.Z` and creates a GitHub Release.
- SemVer: `0.x` until the public MVP, `1.0.0` at launch (README §9.4).

## Verify current settings

```bash
R=FabianHaxhiaj22/tonematch
gh repo view $R --json visibility,defaultBranchRef,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge
gh api repos/$R/branches/main/protection \
  --jq '{checks:.required_status_checks.contexts,strict:.required_status_checks.strict,admins:.enforce_admins.enabled,linear:.required_linear_history.enabled,force:.allow_force_pushes.enabled,reviews:.required_pull_request_reviews.required_approving_review_count}'
gh api repos/$R/actions/permissions/workflow
gh api repos/$R --jq .security_and_analysis
gh api repos/$R/vulnerability-alerts -i 2>&1 | head -1     # 204 = alerts enabled
gh secret list --repo $R                                   # names only
gh api repos/$R/collaborators --jq '.[] | "\(.login) \(.role_name)"'   # roles
gh api repos/$R/invitations --jq '.[].invitee.login'                    # pending invitations
```
