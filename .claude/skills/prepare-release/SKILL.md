---
name: prepare-release
description: Prepares a new release for Terminal Duck — reviews commits since the last tag, confirms the version bump, updates CHANGELOG (and README if needed), runs the kitchen-sink checks, commits, tags, and pushes. Use when the user asks to "cut a release", "prepare a release", "ship a release", "release next version", or runs this skill explicitly.
---

# prepare-release

End-to-end release flow for the `terminal-duck` VS Code extension. The repo already has a tag-driven release workflow at `.github/workflows/release.yml` that runs `kitchen-sink`, extracts the matching CHANGELOG section, and publishes a GitHub Release with the `.vsix` when a `v*` tag is pushed. This skill is what a human (or you) runs locally to get a tag into a shippable state.

**Never bypass the kitchen-sink checks. Never push without user confirmation of the version bump.** Marketplace publishing is manual and out of scope.

## Preconditions

Before doing anything, verify:

- CWD is the terminal-duck repo (check `package.json` has `"name": "terminal-duck"`).
- Current branch is `main`.
- Working tree is clean (`git status --short` returns nothing).
- `main` is in sync with `origin/main` (run `git fetch origin` then `git status` — should report "up to date" or "ahead"; "behind" means stop and pull first).
- No in-progress rebase/merge (`.git/MERGE_HEAD` or `.git/rebase-*` absent).

If any check fails, stop and surface the reason. Do not try to fix silently.

## Workflow

### Step 1 — Gather state

Run in parallel:

```bash
git fetch origin --tags
node -p "require('./package.json').version"    # current version
git describe --tags --abbrev=0                  # last tag (usually v<current>)
git log "$(git describe --tags --abbrev=0)"..HEAD --oneline
git diff "$(git describe --tags --abbrev=0)" --stat   # what files changed
```

If the commit list is empty AND the CHANGELOG `[Unreleased]` section is empty, stop — there is nothing to release.

### Step 2 — Propose the version bump

Scan the commit subjects from Step 1 and classify:

- Any commit with `!` or a `BREAKING CHANGE:` footer → **major** bump.
- Any `feat:` commit → **minor** bump.
- Only `fix:` / `perf:` / `chore:` / `docs:` / `ci:` / `refactor:` / `test:` / `style:` / `build:` → **patch** bump.
- If the mix is e.g. `feat` + `fix`, the highest applicable bump wins (minor here).

**Never auto-commit a version bump.** Show the user:

- current version
- proposed new version + justification (which commits triggered which tier)
- the full commit list since the last tag

Wait for the user to confirm or override (they may want a different tier — e.g. first minor release after a feature freeze bump, or a pre-release `-rc.1` suffix).

### Step 3 — Update CHANGELOG

The `.github/workflows/release.yml` parses `## [X.Y.Z]` headers out of `CHANGELOG.md` to build release notes. The header must match exactly — `## [1.2.3] - 2026-04-19` (with a single space before the date, ISO format). Tags with `-` (e.g. `v1.2.0-rc.1`) are marked prerelease by the workflow.

Actions:

1. If `[Unreleased]` already describes the commits, promote it: rename the header to `## [X.Y.Z] - YYYY-MM-DD` and add a fresh empty `## [Unreleased]` section above it.
2. If `[Unreleased]` is incomplete, draft entries from the commit list and the diff. Keep the "Keep a Changelog" categories: **Added**, **Changed**, **Fixed**, **Removed**, **Security**. Write them at a user-facing level — cite the feature, not the commit SHA.
3. Leave an empty `## [Unreleased]` section at the top.

### Step 4 — Update README if needed

Only touch README.md when user-visible surface has changed:

- New feature or slash command → add to the relevant section.
- New setting → document under a settings table or paragraph.
- New or removed command contribution → update the Commands table.

Do not rewrite wording the user has already tuned (install steps, brand copy). If unsure whether a change belongs in the README, ask.

### Step 5 — Bump the version + sync lockfile

1. Edit `package.json` `"version"` to the new value.
2. Run `npm install --package-lock-only --ignore-scripts` to sync `package-lock.json`. (The lockfile's top-level `version` field must match; the release workflow runs `npm ci` which will complain otherwise.)

### Step 6 — Run the full kitchen-sink

```bash
npm run kitchen-sink
```

This runs `format:check && lint && typecheck && test && compile && package` in sequence. **If any step fails, stop.** Surface the failure and let the user decide. Never bypass with `--no-verify` or skip a step.

On success, a `terminal-duck-X.Y.Z.vsix` is produced at the repo root — note the path so you can mention it in Step 7.

### Step 7 — Confirm before shipping

Show the user a summary:

- version X → Y
- commits included (same list from Step 1)
- changelog entry (the new section, quoted)
- readme changes (if any)
- produced artefact path (e.g. `terminal-duck-1.2.0.vsix`)

Wait for the user's OK. A single "yes" or "ship it" is enough. If they want edits, loop back to the relevant step.

### Step 8 — Commit, tag, push

Stage by name (never `git add -A`):

```bash
git add package.json package-lock.json CHANGELOG.md
# add README.md only if Step 4 modified it
git commit -m "chore: release X.Y.Z"
git tag vX.Y.Z
git push origin main
git push origin vX.Y.Z
```

Use the exact `chore: release X.Y.Z` subject — it matches the repo's convention (`git log --oneline --grep='chore: release'`). No Co-Authored-By trailer unless the user has asked for one.

### Step 9 — Monitor and hand off

```bash
gh run list --limit 2
```

Show the user the queued release run id. Remind them:

- The GitHub Release (with `.vsix`) appears when the workflow finishes — usually ~20s.
- **Marketplace publishing is manual**: they need to upload the `.vsix` to https://marketplace.visualstudio.com/manage/publishers separately. This skill does not and should not do that.

## Guardrails

- **Never** commit without running `kitchen-sink` first and seeing it pass.
- **Never** push before user confirmation of the version bump.
- **Never** force-push, amend prior commits, or rewrite history.
- **Never** skip the lockfile sync — the release workflow runs `npm ci` and will fail if it's out of sync.
- **Never** use `git add .` or `git add -A`. Stage named files only.
- **Never** commit the `.vsix` (it's in `.gitignore`; `vsce package` regenerates it).
- If the release workflow fails on the remote after pushing, **do not delete the tag** to retry — investigate first. Rollback requires deliberate coordination (the tag may already have created a draft Release).
- If the user wants a prerelease, use the `v1.2.0-rc.1` form; the release workflow auto-flags those as prereleases.

## Example (concise form)

User: "cut a release"

Assistant (gathering state → proposes):

> Current: 1.1.0 → proposed: **1.2.0** (minor).
>
> Commits since v1.1.0:
>
> - `feat: add history export command` — minor bump
> - `fix: trim trailing newline in command output` — patch
> - `docs: clarify shell integration requirement`
>
> OK to proceed?

User: yes