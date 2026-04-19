# Roadmap

Rough thinking on what could come next for Terminal Duck. This is a sketchpad, not a commitment — items here haven't been promised and may change direction once we start building.

For the longer list of speculative ideas that inspired this extension (most already out of scope), see [IDEAS.md](IDEAS.md).

## 1. Persistent history with opt-in redaction

### Problem

Today `ShellHistory` is in-memory only. Reloading the window (or even just quitting VS Code) wipes every captured command, which is exactly the moment a user would want to ask Duck about "that failure from earlier." The current behaviour is also why `formatExecutions([])` has to apologise when the buffer is empty.

### Shape

- Persist the rolling buffer to `ExtensionContext.workspaceState` (per-workspace) on each `onDidEnd…` event, with a tiny debounce. Restore into `ShellHistory` from `activate()`.
- Keep the 20-command / 8 KB caps — persistence must not turn the buffer into a log.
- Gate persistence behind a setting (`terminalDuck.persistHistory`) defaulting to `true` for workspaceState only. Global state is off the table: cross-project leakage is a footgun.
- Extend `terminal-duck.clearHistory` to also wipe the persisted copy (obvious, but easy to forget).

### Redaction layer (shipped alongside)

Once history survives reload, the "it'll be gone in a minute" mental model breaks. We need a predictable scrub:

- Run captured output through a redactor before it enters the buffer, not before we send to the LLM. (Redacting at the sink means a bug in prompt assembly could leak; redacting at the source can't.)
- First pass: obvious token shapes — `sk-…`, AWS key prefixes, `Bearer …`, `.env`-style `KEY=value` lines, long hex strings that look like secrets. False positives are fine; false negatives are not.
- Setting `terminalDuck.redactSecrets` (default `true`). Setting `terminalDuck.redactPatterns` for user-supplied regexes.
- Redactions leave a `[REDACTED]` marker so the LLM can still reason about structure ("there was a token here") without seeing it.

### Open questions

- Do we persist across VS Code **sessions** (survives quit) or just across **window reloads**? `workspaceState` does the former; the dev feedback cycle might not want it. Probably: yes, persist across sessions — matches user expectation.
- Do we show the user when redaction fires? A subtle status-bar indicator on the first redaction per session could build trust.
- Multi-root workspaces: one buffer or one per root? One shared is simpler and probably fine.

### Non-goals

- Exporting history to disk. If a user wants a transcript, they can copy from chat.
- Searching across persisted history from past workspaces. Out of scope; that's a different product.

## 2. "Ask Duck?" discovery on command failure

### Problem

The extension is only useful if users remember it exists at the moment a command fails. Today there's zero in-situ prompt — the user has to already know to type `@duck` in Copilot Chat. The feature that makes the tool feel native is meeting the user in the terminal at the moment of failure.

### Shape

- Subscribe to `onDidEndTerminalShellExecution` (we already do) and, on non-zero exit, surface an unobtrusive suggestion to open a chat on that failure.
- Two delivery candidates, pick one:
  - **Terminal link provider** — contribute a `vscode.window.registerTerminalLinkProvider` that matches the exit line (or similar) and offers an "Ask @duck" action. Pros: contextually tied to the command. Cons: terminal-link UX is subtle and easy to miss.
  - **Status bar item** — a transient "Duck: last command failed — explain?" entry that appears for ~60s after a failure and routes a click to a pre-filled `@duck /fix` prompt. Pros: hard to miss, easy to ignore. Cons: feels nudgy if overused.
- Route the click through `vscode.commands.executeCommand('workbench.action.chat.open', { query: '@duck /fix' })` (confirm the exact command and arg shape against current VS Code API — this is the kind of thing that shifts between releases).
- Setting `terminalDuck.suggestOnFailure`: `never | subtle | prominent`, default `subtle`.

### Why two delivery candidates

Because the UX tradeoff is the whole feature. Getting it subtly right is more valuable than shipping both. Start with the status bar prototype, live with it for a week, then decide.

### Open questions

- Rate limiting: if a user runs 30 failing commands in a row (`make` in a loop), one status bar nudge is fine; thirty is harassment. Coalesce to at-most-once per minute.
- Do we suggest on `/explain` for successful-but-interesting commands, or only failures? Probably failures-only at first — the signal is clearer.
- Should the suggestion auto-fill the user's most recent failed command into the chat input as a follow-up? That's a small but meaningful UX improvement — worth trying.

### Non-goals

- Auto-opening the chat pane. Never interrupt focus; the user initiates.
- Inline code actions on log files. Nice idea, separate feature, different scope.

## 3. Terminal selection → "Ask Duck"

### Problem

The status-bar nudge covers "I just hit an error." It doesn't cover "I want to ask about _this specific line_ of output I'm staring at" — stack frame, log line, prompt, whatever. Today the user has to copy, switch to chat, paste, and frame the question.

### Shape

- Register a context-menu action on the terminal selection (`editor/context` won't fire here — terminals use `terminal/context` in the manifest's `menus`).
- The handler reads `vscode.window.activeTerminal` selection text via the proposed selection API (or the supported `vscode.env.clipboard` round-trip if the selection API isn't stable yet — confirm before building).
- Open chat pre-filled with the selection wrapped in a fenced block plus a one-line scaffold: "Help me understand this terminal output:". No slash command — let the user pick.
- Should also be a command palette entry so it's keybindable.

### Open questions

- Does VS Code expose a stable terminal selection API as of `^1.95.0`? If not, the clipboard fallback is acceptable but slightly gross — confirm before committing.
- Do we attach the surrounding command + exit code as additional context, or send the raw selection only? Probably the former: the failure context is exactly the value-add.

## 4. `@duck /diff` slash command

### Problem

The failure-discovery flow tells the user _that_ something broke; it doesn't tell them _what they changed_ that might have caused it. The current `/explain` and `/fix` prompts have to infer cause from output alone.

### Shape

- New slash command alongside `fix` / `rerun` / `explain`. Add to the `package.json` `chatParticipants.commands` array and to `src/prompts.ts`.
- Pull `git diff` since the last successful run of the same command (or, if we can't identify "the same command," since the working tree's last clean state).
- Feed both the recent shell history _and_ the diff into the prompt; the system prompt frames the LLM as "look at what changed, then look at what broke."
- Bound the diff: hard cap at e.g. 4 KB after stripping lockfiles and generated files, otherwise the prompt blows out.

### Open questions

- "Last green run of the same command" requires us to remember exit codes per command string — `ShellHistory` already has this, but we'd need a small lookup helper. Worth it.
- What's "the same command"? Exact string match is brittle (`npm test foo` vs `npm test bar`). Probably match on the first whitespace-separated token, which gives `npm test` ≡ `npm test`. Imperfect but useful.
- Multi-root workspaces: `git diff` against which root? Use the cwd of the failing command.

## 5. Pinned commands

### Problem

The 20-command cap is fine until the failure you care about is 21 commands ago. Users instinctively reach for "scroll back" — which doesn't exist for an in-memory rolling buffer.

### Shape

- Add a `pinned: boolean` flag to `CapturedExecution`.
- A user-facing command (`Terminal Duck: Pin last command`) and the inverse (`Unpin`).
- Pinned entries are exempt from the 20-command eviction policy but still count toward total memory bounds — cap the number of pins (e.g. 5) so a misuse doesn't bloat the buffer.
- Surface pinned-vs-recent visibly in the LM tool output and the chat prompt context, so the model knows which entries are "user said this matters."

### Open questions

- Where does pinning live? Easiest: a status bar action that appears alongside the failure nudge ("Pin this command"). Discoverability matters more than command palette tidiness.
- Does pinning survive a reload? Only meaningful once persistence (item 1) lands — until then, pins die with the buffer. That's fine; ship pinning _after_ persistence or accept the limitation.

## 6. Suggested-command runner

### Problem

When Duck says "try `npm install --legacy-peer-deps`," the user has to copy the command into the terminal themselves. The full loop (problem → suggestion → action → new outcome) lives outside the extension; we only own one segment.

### Shape

- Post-process Duck's chat response: detect fenced shell blocks tagged ` ```bash ` / ` ```sh ` and render a "Run in terminal" action under each.
- The action calls `terminal.sendText(cmd, false)` (no implicit Enter) so the user sees the command queued and confirms by hitting Enter themselves. **Never auto-execute.**
- Active terminal preference: send to the terminal that produced the original failure if we can identify it; otherwise the active terminal; otherwise create a new one.
- Setting `terminalDuck.suggestRunActions` (default `true`) so the more conservative users can disable.

### Open questions

- Chat participant responses don't have post-processing hooks today — we'd be reading our own stream as we emit it and pushing markdown actions back into the response. Confirm `vscode.ChatResponseStream` exposes the right primitive (it has `button` / `commandLink` markdown helpers; check whether they render inside fenced blocks vs only as standalone lines).
- Multi-line / multi-step suggestions: do we render one button per block or one combined "run all" button? Per-block is safer.

### Non-goals

- Auto-running anything. The user always confirms.
- Editing the user's command before sending. We send what Duck wrote; the user can edit in the terminal.

## 7. Graceful model fallback

### Problem

`vscode.lm.selectChatModels({ vendor: 'copilot', family: 'gpt-4o' })` returns empty if the user's Copilot entitlement doesn't include that family — and we currently surface a friendly markdown apology and stop. That's a poor outcome when the user has _some_ Copilot model available, just not 4o.

### Shape

- Try a small priority list of Copilot families in order: `gpt-4o`, `gpt-4o-mini`, then any model the vendor exposes (`selectChatModels({ vendor: 'copilot' })` with no family filter, take the first).
- Log the chosen family in the response footer the first time it falls back, so the user knows they're not on the default.
- Setting `terminalDuck.modelFamilies` (string array) to override the priority list for power users.

### Open questions

- Do we cache the last-good model for the session, or re-resolve every turn? Re-resolving handles entitlement changes mid-session but adds latency; cache + invalidate-on-error is probably the right balance.

### Non-goals

- Non-Copilot vendors. Out of scope until someone asks.

## Not on the roadmap (for now)

Kept here so we stop relitigating:

- **User-selectable model.** Current `copilot/gpt-4o` hardcode is fine until someone asks for something else.
- **Test-framework-aware parsers** (jest/vitest/pytest structured failures). Tempting, but a deep rabbit hole per-framework. Revisit if the redaction + failure-discovery work lands cleanly.
- **Multi-terminal scoping** ("only show commands from this terminal"). Adds manifest complexity for a narrow use case; current "recent across all terminals" is usually what you want.
