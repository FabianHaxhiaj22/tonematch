# Onboarding

Setup for a new developer on their own machine. Read `README.md` first: it's the source of truth. If you use Claude Code, it follows `CLAUDE.md`.

Everything below uses **your own** GitHub account and identity. Never use someone else's account or email on your machine.

## 1. Tools

| Tool | Version | Check |
|---|---|---|
| git | any recent | `git --version` |
| GitHub CLI (`gh`) | recent | `gh --version` |
| nvm | recent | `nvm --version` |
| Node.js | **24.x** (from `.nvmrc`) | `node -v` |
| pnpm | exactly the `packageManager` version in `package.json` (via corepack) | `pnpm -v` |

### Node 24 with nvm
```bash
# Install nvm: use the current command from https://github.com/nvm-sh/nvm#installing-and-updating
# It adds these two lines to ~/.bashrc (or ~/.zshrc). Add them yourself if they're missing:
#   export NVM_DIR="$HOME/.nvm"
#   [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
# Then open a new terminal.

nvm install 24          # or, inside the repo: nvm install   (reads .nvmrc)
nvm alias default 24
node -v                 # v24.x
```
If `node -v` still shows another version, an older Node install is earlier on your `PATH`: remove it or its `PATH` line.

### pnpm with corepack
```bash
corepack enable pnpm    # corepack ships with Node 24
pnpm -v                 # inside the repo, must match "packageManager" in package.json
```
If corepack asks to download pnpm, answer yes (or set `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`).

### GitHub CLI
Install from https://cli.github.com (Fedora: `sudo dnf install gh`; Ubuntu/Debian: see the site; Windows: `winget install GitHub.cli`).

### Windows
The `nvm` above is the Linux/macOS tool. On Windows use **nvm-windows**, a separate project with similar commands.

```powershell
winget install --id CoreyButler.NVMforWindows -e
# Close and reopen the terminal (and VS Code) so the new PATH is picked up.
nvm install 24          # pass the version explicitly
nvm use 24
node -v                 # v24.x
corepack enable pnpm
pnpm -v                 # inside the repo: must match "packageManager" in package.json
```
- If `nvm use` fails with a permissions error, run the terminal as administrator once or turn on Windows **Developer Mode** (it creates a symlink at `C:\nvm4w\nodejs`).
- If `node` is still not found, check that `NVM_HOME` and `NVM_SYMLINK` are on your `PATH`, then open a new terminal.
- Playwright on Windows needs no `--with-deps`: `pnpm exec playwright install chromium` is enough.
- The first `pnpm install` can be slow. pnpm retries timed-out downloads by itself.

**Line endings.** Git for Windows sets `core.autocrlf=true` by default, which checks files out with CRLF, and `pnpm format:check` then fails on files you didn't touch. The repo's `.gitattributes` forces LF, so a fresh clone is fine. If you cloned before `.gitattributes` existed and have **no uncommitted changes**, re-check out the files once (Git Bash):
```bash
git ls-files -z | xargs -0 rm -f && git checkout -- .
```
Don't change `core.autocrlf` globally to fix this.

**Shells.** Git Bash and PowerShell both work once the steps above are done. The Husky hooks run through Git Bash's `sh` either way. In Windows PowerShell 5.1, pnpm's normal stderr output (e.g. `$ eslint .`) shows up red as `NativeCommandError`: that's PowerShell wrapping the text, not a failure. Check the exit code (`$LASTEXITCODE`) or use Git Bash. Bash commands in this guide that use `\` line continuations or `$(…)` should be run in Git Bash.

## 2. Log in to GitHub with your own account
```bash
gh auth login
#   GitHub.com → HTTPS → "Authenticate Git with your GitHub credentials?" Yes → log in with a web browser
gh auth status                 # "Logged in to github.com account <you>", Active account: true
gh api user --jq .login        # must print YOUR login
```
If you have several accounts: `gh auth switch --hostname github.com --user <your-login>`.

## 3. Clone (skip if you already have the repo)
```bash
gh repo clone FabianHaxhiaj22/tonematch
cd tonematch
```

## 4. Repo-local git identity (your noreply email)
The repo is public, so commits use your **GitHub noreply** address, not a personal email. Set it for **this repo only**; don't touch your global git config.
```bash
gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"'    # prints your noreply address
git config --local user.name  "Your Name"
git config --local user.email "<id>+<login>@users.noreply.github.com"
git config --local --get-regexp '^user\.'                          # check
```
Recommended in GitHub → Settings → Emails: turn on **Keep my email addresses private** and **Block command line pushes that expose my email**.

## 5. Install and fetch the models
```bash
pnpm install          # also installs the git hooks (husky): lint-staged + commitlint
git config --local core.hooksPath   # should print .husky/_
pnpm models:fetch     # MediaPipe WASM + face model into public/models (gitignored), checksum-verified
```
`models:fetch` downloads one ~3.8 MB model file from Google's model storage; everything else is copied from `node_modules`. It fails loudly if a checksum doesn't match (`scripts/models.lock.json`).

## 6. Run all checks (same as CI)
```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm validate:data
pnpm test:coverage                    # src/lib must stay ≥ 90%
pnpm build
pnpm exec playwright install chromium # once (Ubuntu/Debian: add --with-deps)
pnpm e2e                              # runs against the production build
```
Dev server: `pnpm dev` → http://localhost:3000. Dev-only debug pages live under `/dev/…` (`page.dev.tsx`, e.g. `/dev/landmarks` from M2) and don't exist in production builds.

## 7. Workflow
- Branch from an up-to-date `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`. One milestone or sub-feature per branch.
- Commit messages and **PR titles** are Conventional Commits (`feat: …`, `fix: …`). The PR title becomes the commit on `main`.
- `main` is protected for everyone: open a PR; `ci` and `pr-title` must pass; the branch must be up to date with `main` ("Update branch"); squash-merge only. No direct pushes, no force pushes.
- Before marking a milestone done: all checks in §6 pass, docs updated (`README.md`, `docs/DECISIONS.md`).
- Never commit secrets, `.env` files, or face images that aren't listed with a licence in `tests/fixtures/SOURCES.md`. Images are never uploaded or stored server-side (README §2, §12).

## 8. Co-author rule (shared work)
When a PR is done by **both** of us, **every commit in it and the squash commit** end with a `Co-authored-by:` trailer for whichever of us isn't that commit's author. Work by only one person gets no trailer. **Never rewrite existing history** to add or remove trailers.

| Author | Trailer |
|---|---|
| Fabian Haxhiaj | `Co-authored-by: Fabian Haxhiaj <187953086+FabianHaxhiaj22@users.noreply.github.com>` |
| Erdiona Tola | `Co-authored-by: Erdiona Tola <353759092+tolaerdiona-commits@users.noreply.github.com>` |

Commits (example by Erdiona on shared work):
```bash
git commit -m "feat: add cheek sampler" \
  --trailer "Co-authored-by: Fabian Haxhiaj <187953086+FabianHaxhiaj22@users.noreply.github.com>"
```
Squash merge, keeping the trailer on the final commit:
```bash
gh pr merge <number> --squash --body "Co-authored-by: Fabian Haxhiaj <187953086+FabianHaxhiaj22@users.noreply.github.com>"
```
In the GitHub web UI, check the squash commit message before confirming: the `Co-authored-by:` line must be in it (as the last lines, after a blank line).

## 9. Who to ask
Repo settings (branch protection, secrets, collaborators) are managed by the owner, Fabian (`@FabianHaxhiaj22`); see `docs/REPO_SETUP.md`. Decisions and open risks: `docs/DECISIONS.md`.
