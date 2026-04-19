# Changelog

All notable changes to Terminal Duck are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-04-19

### Added

- `@duck` chat participant that answers questions grounded in recent terminal activity.
- Shell history capture via `onDidStartTerminalShellExecution` / `onDidEndTerminalShellExecution`, buffering up to 20 commands with cwd, exit code, and up to 8 KB of output each.
- `Terminal Duck: Clear captured shell history` command.
- MIT license.
