# VS Code Extension Ideas

Developer-focused extension concepts that lean on recent / under-used VS Code APIs.

## Modern APIs worth leaning into

- **`vscode.lm` Language Model API** — call Copilot's LLMs directly from any extension (no API key needed; the user's Copilot entitlement pays).
- **Chat Participants** (`@yourname` in Copilot Chat) with streaming, references, and follow-ups.
- **Language Model Tools** (`lm.tools`) — expose tools that _any_ chat agent (Copilot, Cursor, your own) can invoke. MCP-style, but in-process.
- **Language Model Chat Provider** — ship your own model as a first-class provider alongside Copilot.
- **Terminal Shell Integration** — real command lifecycle events, exit codes, and CWD tracking. Most extensions still use dumb `sendText`.
- **Test Controller API** — first-class test tree with inline run/debug glyphs.
- **Quick Diff Provider + SourceControl** — ghost-diff any file against any baseline.
- **Notebook Controller + Renderer** — custom kernels and output renderers for `.ipynb` and custom notebook types.

## Idea shortlist

Ranked by "novel + useful."

### 1. Runtime-aware rubber duck

Uses terminal shell integration to watch the _actual_ commands you ran and their exit codes. A chat participant (`@duck`) can then say "your last `npm test` failed at step X because..." with zero copy-paste.

**Why it's interesting:** very few extensions wire shell integration into LLM context.

**APIs:** Terminal Shell Integration + `vscode.lm` + Chat Participant.

### 2. Git time-travel quick diff

A `QuickDiffProvider` that lets you pick _any_ commit, branch, or stash as the gutter baseline. Paired chat participant (`@blame`) explains _why_ a line changed using commit messages and PR context.

**Why it's interesting:** git-blame meets narrative history.

**APIs:** QuickDiffProvider + SourceControl + `vscode.lm`.

### 3. "Explain what just broke" test companion

When a test fails, auto-capture the diff of code changed since last green, the stack trace, and nearby logs, then produce a focused hypothesis.

**Why it's interesting:** scoped to the failure's call graph, not the whole repo.

**APIs:** TestController + `vscode.lm` + SourceControl (for diffs).

### 4. Ephemeral scratch notebook for any repo

A custom `NotebookController` that spins up a REPL in the repo's actual runtime (Node / Python / Deno) with your imports pre-loaded, backed by shell integration.

**Why it's interesting:** Jupyter-like exploration for non-notebook codebases.

**APIs:** Notebook Controller + Notebook Renderer + Terminal Shell Integration.

### 5. Tool-exposer for your codebase

Register language model tools (`lm.tools`) that expose domain-specific operations — `findUsages`, `runMigration`, `checkInvariant`. Any Copilot user in your repo gets them automatically via a `.vscode/` contribution.

**Why it's interesting:** small surface, high leverage for internal tooling teams.

**APIs:** `lm.tools` + workspace-contributed extensions.

## Recommendation

Push toward **#1** or **#5**. Both exploit under-used APIs and ship something you'd open daily.
