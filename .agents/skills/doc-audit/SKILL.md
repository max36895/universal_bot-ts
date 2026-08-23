---
name: umbot-doc-audit
description: 'Аудит и проверка документации проекта'
---

# Documentation Audit & Refactoring

Deep audit, refactoring, and standardization of `umbot` project documentation — Markdown files and JSDoc comments in
source code.

## Purpose

Make documentation technically accurate, consistent with real code and platform APIs, useful for developers, and
processable by AI agents. Remove filler, eliminate contradictions, fill gaps.

## Context

- **Project**: `umbot` — TypeScript framework for cross-platform chatbots (Yandex Alice, Marusia, VK, MAX, Telegram,
  Viber, SmartApp).
- **Architecture**: Extensions implement `IPlugin`/`IPluginFn` and connect via `bot.use()`. DB and platform adapters are
  specialized plugins.
- **Sources of truth**:
    - `src/` (source code). Code is always authoritative.
    - `cli/` and `cli/template/` when documentation describes project generation, Docker, cloud deployment, tokens,
      generated HTTP requests, or `flow.json`.
    - `tests/` — use only when uncertain about behavior or API.
    - `benchmark/` — do not read (token economy).
- **Platforms**: Any platform info (limits, formats, API specifics) must strictly match official documentation.
- **Post-processing**: Final documentation undergoes external SEO processing (title, description, meta-tags generation).
  Write clean Markdown, no custom HTML wrappers that may break external SEO parsers.

## Workflow

### Step 0: Audit & Plan (BEFORE any edits)

**DO NOT APPLY ANY CHANGES.**

1. Analyze the workspace. Find all MD files and JSDoc blocks in `src/` and project root.
2. Produce an audit report using the format below.
3. **STOP and wait for user confirmation "Plan approved"**.

### Step 1: Iterative Refactoring (ONE FILE AT A TIME)

After confirmation:

- Fix **one file/module at a time**.
- Apply changes and wait for "Next" command before proceeding to the next file.
- If you need exact API limits (Alice, VK, etc.) — try to find them via web search. If not found — mark as
  `[REQUIRES VERIFICATION]`, do not invent numbers.

### Step 2: Format Separation (DRY)

- **JSDoc**: only dry facts for IDE tooltips (signatures, brief `@description`, `@param`, `@returns`).
- **Markdown**: architectural meanings, "why", large examples. Do not duplicate MD in JSDoc.

### Step 3: Content Optimization & Gap Filling

- **Do not add** filler and obvious things (basic TS/JS syntax, how npm works, async/await, string/number types).
- **Do not remove** existing explanations of basic concepts if they help understand the framework's specifics.
- Add missing sections: error handling, request lifecycle, caching (`Preload`), strict mode (`strict_prod`), testing (
  `BotTest`), metrics.
- When documenting CLI-generated projects, verify examples against `cli/flowGenerator.js` and `cli/template/`. Do not
  document generated `fetch` without timeout, plaintext tokens in commit-prone files, or silent overwrite behavior.
- Structure material for quick onboarding: Quick Start → Architecture → Core Concepts → Platform/DB Adapters → Testing →
  Performance → FAQ/Recipes.

### Step 4: Human-Centric & Useful

- Documentation must be equally useful and understandable for both humans and AI agents.
- Narrative must be **human-oriented** (address to developer, logical transitions, real-world examples).
- **Forbidden**: meta-phrases like "If you are an agent...", "For AI assistants...", "When processing this file by a
  neural network...".

### Step 5: Iterative Verification (MANDATORY)

After all edits, perform **minimum 2 rounds of re-audit**.

- Each round checks different aspects: one — code examples, another — API accuracy, third — formatting.
- If 0 problems found in a round — can stop. If problems found — fix and run next round.

## Audit Report Format

```markdown
## DOCUMENTATION AUDIT REPORT

### Critical (Must Fix)

1. **[file:line]** — Description of the problem
    - **What's wrong**: Exact description
    - **Impact**: How this affects developers
    - **Fix**: What needs to change

### High (Should Fix)

2. ...

### Medium (Nice to Fix)

3. ...

### Low (Cosmetic)

4. ...

### Verified OK (No Issues)

- `src/core/Bot.ts` JSDoc — accurate, matches code
- `src/plugins/platforms/Telegram/Adapter.ts` — platform limits correct
```

### Priority Definitions

| Priority     | Definition                                                               | Example                              |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| **Critical** | Code example doesn't compile, API info is wrong, contradicts source code | Wrong method signature in JSDoc      |
| **High**     | Missing important section, inconsistent terminology across files         | Different names for the same concept |
| **Medium**   | Outdated example, suboptimal structure, minor contradictions             | Old API version referenced           |
| **Low**      | Formatting, style inconsistency, missing optional details                | Broken markdown table                |

## Quality Standards

- [ ] **Accuracy**: 100% match with real code and official platform APIs.
- [ ] **Consistency**: Unified terminology, no duplicates, no MD ↔ JSDoc conflicts.
- [ ] **Practical value**: Developer can copy an example, run it, and get a result. Explains `why` and `how`, not just
      `what`.
- [ ] **Readability**: Clear to a junior with basic TS knowledge, without over-explaining the obvious. Written for
      humans.
- [ ] **Security & Best Practices**: Emphasis on `strict_prod`, token hiding, `MongoAdapter` for prod, ReDoS protection,
      voice platform timeouts.
- [ ] **Clean format**: Clean Markdown, ready for automatic SEO processing without breaking parsers.
- [ ] **No blind copying**: Never copy method/interface signatures from other MD files (GUIDE.md, FAQ.md) without
      checking real code in `src/`.

## Output Rules

1. **SCOPE (CRITICAL)**:
    - You may modify **ONLY** lines containing comments (`//`, `/* */`, `/** */`) and `.md` files.
    - **FORBIDDEN** to change actual code (`.ts` outside comments): types, signatures, logic, variable names. If code is
      broken — do not fix it, write a comment `// TODO: [Problem description]`.
2. **No filler**: Do not write introductions like "Great, I analyzed the code and here are my changes". Apply fixes
   directly.
3. **Questions**: If uncertain about platform behavior — **stop execution** and ask in chat.
4. **No repetition**: Do not re-report findings that were already dismissed. Track what you've checked.

## Self-Verification Checklist

### After EVERY file change:

- [ ] Re-read the changed section — confirmed no duplicates and formatting is correct.
- [ ] If changed a code example — verified all imports are in place and variables are declared.

### When working with API documentation:

- [ ] **NEVER copy method signatures from GUIDE.md** — GUIDE simplifies for readability. Always verify against real code
      in `src/`.
- [ ] For each method in a table: verified method name, parameter types, return type against source code.
- [ ] Verified all optional parameters are marked as optional (`?`).

### When writing code examples:

- [ ] Each example must compile "as-is" — all imports, all types, all variables.
- [ ] Do not use placeholders like `handler` without definition — write inline functions.
- [ ] Check string literal casing (especially in command slots — they are case-sensitive).

### When formatting:

- [ ] Check that markdown markers `**` are not broken across lines.
- [ ] Check that spaces exist before parentheses: `resource (description)`, not `resource(description)`.
- [ ] Check that all tables have the same number of columns in header and rows.

### Final check:

- [ ] Walk through each changed file and verify against source code (`src/`).
- [ ] Verified code examples are working and use current API.
- [ ] Confirmed text is written for humans, no "talking to AI".
- [ ] Did not remove useful explanations, replacing them only with "obvious" facts.
- [ ] Platform descriptions match their real APIs.
- [ ] Ran `npm run build` — confirmed TypeScript compiles without errors.

## Start Command

Your first and only task now is to execute **Step 0**. Produce the audit report and **STOP**. Do not apply fixes until
the user responds "Plan approved".
