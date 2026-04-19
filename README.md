# Terminal Duck

A runtime-aware rubber duck for VS Code. `@duck` is a chat participant that sees the commands you actually ran in the integrated terminal — with their exit codes and output — and grounds its answers in that history instead of making you copy-paste.

## How it works

Terminal Duck subscribes to VS Code's terminal shell integration events and keeps a rolling buffer of your last 20 commands (command line, working directory, exit code, captured output). When you ask `@duck` something in Copilot Chat, it includes the most recent executions as context for the LLM.

## Requirements

- VS Code `^1.95.0`
- [GitHub Copilot Chat](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot-chat) installed and signed in — Terminal Duck uses the `vscode.lm` API, which routes through Copilot's entitlement
- An integrated terminal with [shell integration](https://code.visualstudio.com/docs/terminal/shell-integration) active (default for bash, zsh, fish, and pwsh in recent VS Code)

## Usage

1. Run some commands in the integrated terminal.
2. Open Copilot Chat and type `@duck why did my last test fail?` (or any follow-up question).
3. Duck cites the specific command and exit code when relevant.

Example prompts:

- `@duck what's going wrong with my build?`
- `@duck the last command hung — what should I try?`
- `@duck I ran three things, give me a summary`

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
