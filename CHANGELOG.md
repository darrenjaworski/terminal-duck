# Changelog

All notable changes to Terminal Duck are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-04-19

### Added

- "Ask Duck?" status bar hint. On a non-zero exit in a shell-integrated terminal, a subtle right-aligned status bar item appears for 60 seconds; clicking it opens Copilot Chat pre-filled with `@duck /explain` and a concrete question about the failure. Subsequent failures within the window extend the timer instead of flickering.
- `terminalDuck.suggestOnFailure` setting (boolean, default `true`) to opt out of the status bar hint.

## [1.0.1] - 2026-04-19

### Added

- Release workflow (`.github/workflows/release.yml`) that, on any `v*` tag push, runs the full kitchen-sink, verifies the tag matches `package.json`'s version, extracts the matching CHANGELOG section, and creates a GitHub Release with the `.vsix` attached. Tags containing `-` are marked as prereleases.
- Extension icon (`images/icon.png`) combining a terminal window and duck, wired up via the `icon` field in `package.json` so the Marketplace listing and chat participant show branding.

## [1.0.0] - 2026-04-19

Initial public release.

### Added

- `@duck` chat participant in Copilot Chat that answers questions grounded in recent terminal activity.
- Shell history capture via `onDidStartTerminalShellExecution` / `onDidEndTerminalShellExecution`, buffering up to 20 commands with cwd, exit code, and up to ~8 KB of output each.
- Slash commands: `@duck /fix`, `@duck /rerun`, `@duck /explain` — each with a focused system prompt.
- `terminal-duck_getRecentCommands` language model tool (referenceable as `#duck` in chat) so other chat participants and Copilot agent-mode can fetch recent terminal activity. Accepts an optional `limit` argument (1–20, default 6).
- `Terminal Duck: Clear captured shell history` command.
- MIT license.
