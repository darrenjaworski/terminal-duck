# Changelog

All notable changes to Terminal Duck are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-04-19

Initial public release.

### Added

- `@duck` chat participant in Copilot Chat that answers questions grounded in recent terminal activity.
- Shell history capture via `onDidStartTerminalShellExecution` / `onDidEndTerminalShellExecution`, buffering up to 20 commands with cwd, exit code, and up to ~8 KB of output each.
- Slash commands: `@duck /fix`, `@duck /rerun`, `@duck /explain` — each with a focused system prompt.
- `terminal-duck_getRecentCommands` language model tool (referenceable as `#duck` in chat) so other chat participants and Copilot agent-mode can fetch recent terminal activity. Accepts an optional `limit` argument (1–20, default 6).
- `Terminal Duck: Clear captured shell history` command.
- MIT license.
