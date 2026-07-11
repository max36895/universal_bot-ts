# Code Audit: Security, Performance & Architecture

Senior-level code audit of `umbot` — finding real issues and fixing them. No cosmetic complaints.

## Purpose

Conduct a thorough audit of `umbot` code, find real problems, and fix them. Key principle: **Senior Review**. Every finding must pass internal challenge. Complaining for the sake of complaining is forbidden. If a problem doesn't affect security, performance, or production stability — it's not worth mentioning.

## Context

- **Project**: `umbot` (TS framework: Alice, Marusia, VK, MAX, Telegram, Viber, SmartApp).
- **Architecture**: Plugins (`IPlugin`), `bot.use()`, DB/platform adapters.
- **Sources of truth**:
    - `src/` — source code (Priority #1).
    - `tests/` — only for verifying expected behavior (if code contradicts tests — it's a bug, ask the user).
    - `benchmark/` — do not touch.
- **Enterprise context**: Library for banks and government agencies. Priorities: Security > Stability > Performance > Code cleanliness.
- **Ignore**: Comments and Markdown documentation (they are fixed by a different prompt).

## Audit Dimensions (7 Categories)

Find specific problems, not general discussions:

1. **SECURITY**: ReDoS (check `isRegexLikelySafe`), Prototype Pollution, token leaks in logs (especially in `strict_prod`), injections, XSS.
2. **PERFORMANCE**: Event Loop Blocking (synchronous operations in async), memory leaks (caches, timers without `.unref()`), O-complexity, HTTP timeouts.
3. **CONCURRENCY**: Race conditions, forgotten `await`, incorrect `Promise.all`, Shared State access.
4. **RESOURCE MANAGEMENT**: Connection closing (Mongo/File), timer cleanup, streams, file descriptors.
5. **ERROR HANDLING**: Swallowed errors, crashes, incorrect Graceful Shutdown.
6. **ARCHITECTURE & API**: SOLID, DRY, hidden magic, breaking changes, API intuitiveness.
7. **TYPESCRIPT**: `any` usage, `@ts-ignore`, strict mode violations.

## Workflow

### Step 0: Audit, Senior Review & Plan (BEFORE any edits)

**DO NOT APPLY ANY CHANGES.**

1. **Context gathering**: Don't read all files at once! First study `src/` structure, read entry points (`index.ts`, `Bot.ts`, `AppContext.ts`). Then load files relevant to audit categories on demand.
2. **Generation & Challenge (Senior Review)**: Find problems and **immediately challenge them yourself**.
    - _Example_: "Found `readFileSync`. But it's `FileAdapter` for dev mode, not hot path. Finding dismissed."
3. **Report formation**: Output a report in the format below. Include **ONLY** findings you could NOT challenge. Dismissed findings go in a separate block at the end with brief reason (1 sentence).
4. **STOP and wait for user response "Plan approved"**.

**Report Format:**

```markdown
## AUDIT REPORT

### Confirmed Findings (Require Fix)

1. **[Critical] [Security]** `src/core/utils/utils.ts:45` — ReDoS vulnerability
    - **Description**: Heuristic doesn't catch nested quantifiers `(a+)+`.
    - **Impact**: DoS attack.
    - **Fix**: Replace with `re2` or tighten regex.

2. **[High] [Concurrency]** `src/plugins/db/Mongo/Adapter.ts:112` — Race condition
    - ...

### Dismissed Findings (Senior Review)

- `src/utils/Text.ts:112` (readFileSync) — Dismissed: not hot path, initialization at startup.
- `src/core/Bot.ts:88` (any type) — Dismissed: public API for custom plugins, strict typing breaks backward compatibility.
```

### Step 1: Iterative Fixes (ONE FILE AT A TIME)

After user confirmation "Plan approved":

- Fix strictly one file at a time.
- Apply changes.
- After applying, output to chat:
    - What changed and how it solves the problem.
    - Potential side effects.
- Ask: "Moving to next file?". Wait for command.
- If fix requires public API change (Breaking Change) — STOP and ask the user.

### Step 2: Final Verification

After all fixes, output final status: which findings are closed, which remain and why.

## Output Rules

1. **SCOPE (CRITICAL)**:
    - You change **ONLY** code (`.ts` files in `src/`).
    - **FORBIDDEN** to change comments, Markdown, or tests for style. BUT if fixing a bug requires updating a test or adding `@throws` to JSDoc — this is allowed.
2. **No filler**: No introductions. Straight to business.
3. **Questions**: If uncertain about platform behavior — stop execution and ask.

## Start Command

Before starting Step 0, ask only these 3 critical questions (if they're not obvious from context). Do not ask more:

1. **Breaking Changes**: Am I ready for breaking changes in the public API for security/performance, or must fixes be strictly backward compatible?
2. **Audit Focus**: Are there specific modules (e.g., core, adapters) to check first, or start with the most critical (Security/Performance)?
3. **RegExp**: Should maximum attention be given to replacing standard RegExp with re2 wherever there is user input?

Once answered, execute Step 0. STOP and wait for confirmation.
