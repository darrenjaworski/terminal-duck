# Terminal Duck

A runtime-aware rubber duck for VS Code. `@duck` is a chat participant that sees the commands you actually ran in the integrated terminal — with their exit codes and output — and grounds its answers in that history instead of making you copy-paste.

## How it works

Terminal Duck subscribes to VS Code's terminal shell integration events and keeps a rolling buffer of your last 20 commands (command line, working directory, exit code, captured output). When you ask `@duck` something in Copilot Chat, it includes the most recent executions as context for the LLM.

## Requirements

- VS Code `^1.95.0`
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) installed and signed in — Terminal Duck uses the `vscode.lm` API, which routes through Copilot's entitlement
- An integrated terminal with [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) active (default for bash, zsh, fish, and pwsh in recent VS Code)

## Install

Terminal Duck ships as a VSIX (no marketplace listing yet).

1. Grab `terminal-duck-1.0.0.vsix` from the [latest release](https://github.com/darrenjaworski/terminal-duck/releases), or build it yourself with `npm install && npm run package`.
2. In VS Code, open the Extensions view → **... (More Actions)** → **Install from VSIX...** and pick the file.
3. Reload the window when prompted.

## Usage

1. Run some commands in the integrated terminal.
2. Open Copilot Chat and type `@duck why did my last test fail?` (or any follow-up question).
3. Duck cites the specific command and exit code when relevant.

Example prompts:

- `@duck what's going wrong with my build?`
- `@duck the last command hung — what should I try?`
- `@duck I ran three things, give me a summary`

## Slash commands

| Command          | What it does                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------------- |
| `@duck /fix`     | Finds the most recent failing command and proposes a single concrete fix.                     |
| `@duck /rerun`   | Suggests the next command to run — retry with different flags, or the natural follow-up step. |
| `@duck /explain` | Explains what the most recent command did and what its output means.                          |

## Use from other agents (Language Model Tool)

Terminal Duck also registers a `#duck` tool via the `lm.tools` API. Any chat participant or Copilot agent-mode session can call it to fetch your recent terminal activity.

In Copilot Chat, reference it explicitly with `#duck` to include recent commands in the prompt:

```
#duck why might the test runner be picking up the wrong config?
```

Agents can invoke `terminal-duck_getRecentCommands` programmatically; accepts an optional `limit` (1–20, default 6).

## Commands

| Command                                       | Description                         |
| --------------------------------------------- | ----------------------------------- |
| `Terminal Duck: Clear captured shell history` | Wipes the in-memory command buffer. |

## Caveats

- Shell integration must be active. If your terminal is a plain PTY (or you're running inside a shell VS Code doesn't recognise), Duck has nothing to work with and will say so.
- Output is truncated at ~8 KB per command to keep the LLM context tight.
- History lives in memory only — it resets when the extension reloads.

## Development

```bash
npm install
npm run kitchen-sink   # format:check, lint, typecheck, test, compile, package
```

Press `F5` in VS Code to launch an Extension Development Host with Terminal Duck loaded.

## License

MIT — see [LICENSE](LICENSE).
