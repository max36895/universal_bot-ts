---
name: umbot-code-audit
description: 'Аудит кода проекта'
---

# Code Audit: Security, Performance & Architecture

Senior-level code audit of `umbot` — finding real issues and fixing them. No cosmetic complaints.

## Purpose

Conduct a thorough audit of `umbot` code, find real problems, and fix them. Key principle: **Senior Review**. Every
finding must pass internal challenge. Complaining for the sake of complaining is forbidden. If a problem doesn't affect
security, performance, or production stability — it's not worth mentioning.

## Context

- **Project**: `umbot` (TS framework: Alice, Marusia, VK, MAX, Telegram, Viber, SmartApp).
- **Architecture**: Plugins (`IPlugin`), `bot.use()`, DB/platform adapters.
- **Sources of truth**:
    - `src/` — source code (Priority #1).
    - `cli/` — product generator. Treat generated TypeScript/templates/configs as production code because users run
      them directly.
    - `tests/` — only for verifying expected behavior (if code contradicts tests — it's a bug, ask the user).
    - `benchmark/` — do not touch.
- **Enterprise context**: Library for banks and government agencies. Priorities: Security > Stability > Performance >
  Code cleanliness.
- **Ignore**: Comments and Markdown documentation (they are fixed by a different prompt).

## CRITICAL: Audit Priority Order

The audit MUST follow this priority order. Do not skip levels.

### Priority 1: Platform Adapters (MOST CRITICAL)

**This is the #1 source of production bugs.** Every platform adapter must be verified against the REAL platform API.

For EACH platform (Telegram, VK, Alisa, Marusia, Max, Viber, SmartApp):

1. **Response format**: Does `getContent()` return the exact JSON structure the platform API expects?
2. **Button format**: Are button field names, types, nesting correct? (e.g., Telegram requires
   `InlineKeyboardButton[][]`, not flat `InlineKeyboardButton[]`)
3. **Card/media format**: Are image, audio, carousel formats correct?
4. **API requests**: Are method URLs, HTTP methods, parameter names, authentication correct?
5. **Data flow**: Trace the path from `CardContent` → `cardProcessing()` → API request. Is any data silently dropped?

**How to verify**: Read the adapter's `Button.ts`, `Card.ts`, `Adapter.ts`, and the corresponding `API/*Request.ts`
file. For each format, check:

- Field names match the platform's official API documentation
- Field types match (string vs number vs object vs array)
- Nesting structure matches (array of arrays vs flat array)
- Size limits match (caption length, button count, payload size)

### Priority 2: Engine — Command Resolution and Request Flow

Trace the EXACT path of a request:

```
webhookHandle() → run() → #runApp() → #getAppContent() → controller.run()
    ├── #stepResolver()
    ├── _getCommand()
    │   ├── #getExactCommand()
    │   ├── customCommandResolver
    │   └── loop: commands → #searchCommandsInGroup() / Text.isSayText()
    ├── _getIntent()
    └── fallback command
```

For each step, verify:

- What happens when the callback is async? Is `await` used correctly?
- What happens when the callback throws? Is the error caught?
- What happens when the callback returns `false`, `null`, `undefined`, or a value?
- Are there race conditions in shared state access?

### Priority 3: Database Adapters

1. **FileAdapter**: Concurrent writes, data integrity during shutdown, file locking
2. **MongoAdapter**: Connection lifecycle, error recovery, `databaseInfo` population
3. **Base adapter**: save/update/insert flow, escapeString correctness

### Priority 4: Everything Else

- RateLimiter (concurrency, memory management)
- Request.ts HTTP client (timeouts, error handling)
- CLI generator and templates: generated TypeScript, Dockerfile, cloud configs, overwrite safety, token handling
- Nlu processing
- Sound processing
- Navigation component
- Text utilities (regex cache, similarity)

### Проверенные точки (аудит 3.1.0 — закрывай их в первую очередь, они уже ловили баги)

- **Request.ts**: `_getOptions()` возвращает `undefined` при ошибке attach — без
  проверки перед `fetch` уходил паразитный GET к API платформы (фикс в `#run`).
  `send()` сбрасывает `attach/post/get/customRequest` после вызова; `#error` —
  `Error | string`, лог-хелперы API-клиентов обязаны принимать оба типа.
- **Метрики**: `logMetric` обязан прогонять имя и label через маскирование
  (`#maskLogData`) — `Request` кладёт в label URL с токеном Telegram.
- **rateLimiter**: (1) батч из очереди должен проверять `st.count >= limit` перед
  каждым элементом — иначе окно исполняет до 2×limit; (2) вытесненные записи
  (`evictEntry`/`destroyRateLimiter`) помечаются `dead`, а `processQueue` в `finally`
  обязан проверять `!st.dead` — иначе бесконечный перезапуск; (3) переполнение
  очереди — экспортируемый `RateLimitQueueOverflowError` + флаг
  `platformOptions.rateLimitOverflow` (ядро перехватывает исключение middleware).
- **ipFilter**: поддержка IPv6 (BigInt, `::`-сжатие, hex-mapped `::ffff:102:304`);
  строковый срез `::ffff:` — только когда хвост dotted-quad, иначе hex-форма
  портится; правила сравниваются по версии адреса (v4-правило не матчит v6-клиента).
- **EnvConfig**: `#` без пробела перед ним — часть значения (`pass#word`), инлайн-
  комментарий — только ` #` (конвенция dotenv, quote-aware).
- **isRegexLikelySafe**: опасны квантифицированные группы с квантификатором,
  альтернативой или `.` внутри (`(a+)+`, `(a|aa)+`, `(?:\w+\.)+`); `.*`, `.*.*`,
  `(abc)+`, `(?:a{2,3})` — безопасны. При анализе тела группы пропускай префикс
  `(?:`/`(?=`/`(?<name>` — иначе `?` из префикса лож срабатывает как квантификатор.
- **FileAdapter**: `#isForbiddenKey` (`__proto__`/`constructor`/`prototype`) обязателен
  и на чтение (`_select`/`#selectInPrimaryKey`), не только на запись/удаление —
  иначе `content['__proto__']` возвращает `Object.prototype` как «найденную запись».
- **Text.isSayTrue/isSayFalse**: границы слова через lookaround `(?<![a-zа-яё0-9_])`,
  чтобы распознавать «Да!»/«Нет, спасибо» и не матчить «даже»/«небоскреб».
- **CommandReg/группы**: строковый паттерн группы (fallback при превышении
  MAX_COUNT_FOR_GROUP) обязан компилироваться через кэш `getGroupRegExpCompiled`,
  не через `getRegExp` на каждом запросе.
- **CLI**: `spawnSync` с `shell: true` (Windows) склеивает аргументы без экранирования —
  значения из `.env`/flow.json обязаны квотироваться и санитизироваться; при записи
  `.env` вырезай `\r\n` из значений; имя проекта, начинающееся с цифры, — префикс `_`.

## Audit Dimensions (10 Categories)

Find specific problems, not general discussions:

1. **SECURITY**: ReDoS (check `isRegexLikelySafe`), Prototype Pollution, token leaks in logs (especially in
   `strict_prod` and custom loggers), plaintext secrets in generated files (`serverless.yml`, source files,
   package.json), injections, XSS.
2. **PERFORMANCE**: Event Loop Blocking (synchronous operations in async), memory leaks (caches, timers without
   `.unref()`), O-complexity, HTTP timeouts. Generated HTTP code must not create unbounded `fetch` calls inside bot
   handlers.
3. **CONCURRENCY**: Race conditions, forgotten `await`, incorrect `Promise.all`, Shared State access.
4. **RESOURCE MANAGEMENT**: Connection closing (Mongo/File), timer cleanup, streams, file descriptors.
5. **ERROR HANDLING**: Swallowed errors, crashes, incorrect Graceful Shutdown.
6. **ARCHITECTURE & API**: SOLID, DRY, hidden magic, breaking changes, API intuitiveness.
7. **TYPESCRIPT**: `any` usage, `@ts-ignore`, strict mode violations.
8. **TYPE COERCION**: Implicit conversions that produce wrong results (e.g., `+""` → `0`, `+undefined` → `NaN`). Check
   every arithmetic operation and comparison on values that come from parsing.
9. **EDGE CASES IN PARSING**: JSON.parse without try/catch, regex matching edge cases (empty strings, special
   characters), default values that hide bugs.
10. **REGEX COMPILATION IN HOT PATHS**: `new RegExp()` calls inside loops or per-request methods. Prefer
    `String.prototype.replaceAll()` for literal replacements, cache compiled RegExp for repeated use.
11. **GENERATED PRODUCT QUALITY**: For every CLI/template change, inspect the generated project as if it were user code.
    It must compile with the generated tsconfig, keep Docker/cloud deployment working, avoid silent overwrites, and avoid
    persisting real secrets outside ignored local files.

## Workflow

### Step 0: Audit, Senior Review & Plan (BEFORE any edits)

**DO NOT APPLY ANY CHANGES.**

1. **Context gathering**: Don't read all files at once! First study `src/` structure, read entry points (`index.ts`,
   `Bot.ts`, `AppContext.ts`). Then load files relevant to audit categories on demand.
2. **Platform verification (Priority 1)**: For each platform adapter, read the actual API request file and compare
   formats against known API specs. This is the most critical step.
3. **Async chain tracing (Priority 2)**: For each async method, trace the full promise chain. Check for forgotten
   `await`, unhandled rejections, and race conditions.
4. **Performance hot path scan (Dimension 10)**: Search for `new RegExp(` in all files. Check if any are inside loops or
   per-request methods. Search for `.replace(new RegExp(`, `.forEach.*new RegExp(`, `Array.sort` inside hot paths.
5. **Type coercion check (Dimension 8)**: Find all `+variable` and `Number(variable)` conversions. Verify empty strings
   and nullish values are handled.
6. **CLI/generated project scan**: If the task touches generated behavior or broad product quality, inspect `cli/`,
   `cli/template/`, `cli/AGENTS.md`, and `tests/cli/`. Check generated HTTP timeouts, safe JSON interpolation,
   Docker build stages, cloud config secrets, and overwrite protection.
7. **Generation & Challenge (Senior Review)**: Find problems and **immediately challenge them yourself**.
    - _Example_: "Found `readFileSync`. But it's `FileAdapter` for dev mode, not hot path. Finding dismissed."
    - _Example_: "Found `getButtonJson` returns null. But maybe it's intentional? No — the code calls it and expects a
      string. Finding confirmed."
8. **Verification BEFORE reporting**: For EACH finding, perform ALL of these checks before adding it to the report:
    - **Read surrounding code**: Does the context change the interpretation?
    - **Check callers**: Is the code path actually reachable in production?
    - **Assess impact**: What ACTUALLY breaks? Not "could break" — what WILL break?
    - **Consider alternatives**: Is there a reason the code is written this way?
    - **Challenge yourself**: Can you dismiss this finding with a concrete reason? If yes — dismiss it.
9. **Report formation**: Output a report in the format below. Include **ONLY** findings you could NOT challenge after
   the verification above. Dismissed findings go in a separate block at the end with brief reason (1 sentence).
10. **STOP and wait for user response "Plan approved"**.

**Report Format:**

```markdown
## AUDIT REPORT

### Confirmed Findings (Require Fix)

1. **[Critical] [Platform]** `src/plugins/platforms/Telegram/Button.ts:44` — Keyboard structure mismatch
    - **Description**: `inline_keyboard` is flat `[]` but Telegram API requires `[[]]`.
    - **Impact**: Buttons never display correctly.
    - **Fix**: Wrap each button in its own array.

2. **[High] [Concurrency]** `src/core/Bot.ts:1018` — DB connection lock never released
    - ...

### Dismissed Findings (Senior Review)

- `src/utils/Text.ts:112` (readFileSync) — Dismissed: not hot path, initialization at startup.
- `src/core/Bot.ts:88` (any type) — Dismissed: public API for custom plugins, strict typing breaks backward
  compatibility.
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

After all fixes, run verification in the project order: `npm run build`, then `npm run test`, then `npm run prettier`,
then `npm run lint`. Output final status: which findings are closed, which remain and why.

## Output Rules

1. **SCOPE (CRITICAL)**:
    - Default audit scope is code in `src/` plus `cli/` when generated product behavior is relevant.
    - **FORBIDDEN** to change comments, Markdown, or tests for style. BUT if fixing a bug requires updating a test,
      changelog, AGENTS.md, or this skill to prevent repeated mistakes — this is allowed after user approval.
2. **No filler**: No introductions. Straight to business.
3. **Questions**: If uncertain about platform behavior — stop execution and ask.
4. **Verification**: Every finding MUST be verified by reading surrounding code. False positives waste time and erode
   trust.
5. **No repetition**: Do not re-report findings that were already dismissed in this session. Track what you've checked
   and dismissed.
6. **Performance-first mindset**: When evaluating a finding, ask: "Does this affect performance in a measurable way?"
   Micro-optimizations (< 1μs difference) are not worth changing.

## Start Command

Before starting Step 0, ask only these 3 critical questions (if they're not obvious from context). Do not ask more:

1. **Breaking Changes**: Am I ready for breaking changes in the public API for security/performance, or must fixes be
   strictly backward compatible?
2. **Audit Focus**: Are there specific modules (e.g., core, adapters) to check first, or start with the most critical (
   Security/Performance)?
3. **RegExp**: Should maximum attention be given to replacing standard RegExp with re2 wherever there is user input?

Once answered, execute Step 0. STOP and wait for confirmation.
