---
apply: always
mode: all
---

You are an AI agent working with the umbot framework codebase. Your task is to modify the code, strictly adhering to architectural invariants, build order, and quality standards. Any deviation from these rules is considered an error.

1. Project Structure and Responsibilities
   Look at this map once. Don't try to guess file locations.
   src/
   ├── index.ts # MAIN ENTRY POINT. Exports only the public API. Any changes to exports here breaks backward compatibility.
   ├── build.ts # Utility for running without boilerplate code (run() function).
   ├── test.ts # Export utilities for local console testing (BotTest).
   ├── core/ # THE CORE OF THE FRAMEWORK. Has no dependencies on the plugins/ folder.
   │ ├── Bot.ts # Main orchestrator class. Manages the lifecycle, middleware, and command registration.
   │ ├── AppContext.ts # State storage: configs, tokens, plugin registry, logger, metrics.
   │ ├── utils/MemorySessionStorage.ts # In-process userData session (LRU + TTL, no timers): isLocalStorage on platforms without localStorage and no DB adapter.
   │ └── interfaces/ # Strict TypeScript contracts (IAppConfig, IAppParam, IPlatformAdapter, etc.).
   ├── controller/ # USER BUSINESS LOGIC.
   │ ├── BotController.ts# Base class that the user inherits. Contains text, buttons, card, nlu, userData, and state.
   │ └── BaseBotController.ts # Default controller implementation (fallback).
   ├── components/ # PLATFORM-INDEPENDENT UI/UX PRIMITIVES.
   │ ├── button/ # Button generation logic (Buttons, getButton).
   │ ├── card/ # Card and gallery logic (Card).
   │ ├── image/ # Data structures for images.
   │ ├── nlu/ # Parsing and extracting entities (Nlu, getFio, getDateTime).
   │ ├── sound/ # Sound effects and TTS management.
   │ └── standard/ # Helper components (e.g., Navigation for pagination).
   ├── plugins/ # ADAPTERS (PLATFORMS AND DB). Depend on core/ and components/, but NOT vice versa.
   │ ├── platforms/ # Adapters: Alisa, Telegram, Vk, Marusia, Max, Viber, SmartApp. Convert a universal response to a platform-specific format.
   │ └── db/ # Database adapters: FileAdapter, MongoAdapter, BaseDbAdapter.
   ├── api/ # NETWORK LAYER.
   │ └── request/Request.ts # Basic HTTP client for internal framework requests to external platform APIs.
   ├── models/ # ORM-LIKE LAYER.
   │ ├── Model.ts # Base class for working with data.
   │ ├── UsersData.ts # User data storage model.
   │ ├── ImageTokens.ts # Image token caching model.
   │ └── SoundTokens.ts # Audio token caching model.
   ├── utils/ # PURE FUNCTIONS AND UTILITIES.
   │ ├── standard/Text.ts # String manipulation, RegExp caching, text similarity checking.
   │ ├── standard/RegExp.ts # Safe compilation of regular expressions with ReDoS protection.
   │ └── standard/util.ts # File operations (fread, fwrite, isFile), working with objects.
   ├── middleware/ # Built-in request handlers (e.g., rateLimiter.ts).
   └── docs/ # Markdown documentation source files.
   tests/ # UNIT TESTS (Jest). The folder structure strictly follows the src/ structure.
   cli/ # Source code of the CLI utility (npx umbot create).
   benchmark/ # Scripts for stress testing performance (RPS, memory).
   Important: cli/ is a product surface, not a helper sandbox. It generates code that users run in production. Any audit
   or change that affects project creation, templates, generated TypeScript, generated Docker/Yandex Cloud config, or
   flow.json processing MUST inspect cli/ and tests/cli/.
2. Architectural Invariants (Strict Rules)
   Dependency Direction: Modules from src/plugins/ MAY import from src/core/, src/components/, and src/utils/. Modules from src/core/ or src/components/ MUST NOT import anything from src/plugins/.
   Public API Stability: Changing method signatures, class names, or removing exports from src/index.ts and other public entry points (src/plugins.ts, src/build.ts) is prohibited. Doing so will break code for library users. Any extension must be backwards compatible.
   Encapsulation: Use private fields (#field) for internal class state. The "any" type is prohibited. Use "unknown" with type narrowing or strict interfaces.
3. Workflow (Strict Algorithm)
   When you receive a code modification task, perform the steps strictly in the specified order. Do not proceed to the next step if the previous one is not completed successfully.
   Analysis: Identify the affected files using the structure map from Section 1.
   Plan: Formulate a brief plan of changes (which files, what logic).
   Modification: Make the changes to the code.
   Persistence check: если с репозиторием могут работать параллельно (IDE, другой агент, аудит-скрипт), после правок проверь, что они физически сохранились (grep по ключевым маркерам правок), и коммить/фиксируй промежуточное состояние до того, как другой процесс сделает checkout/stash. Инструмент правок может отчитаться об успехе, а файл — быть откачен параллельным процессом.
   Verification (STRICT ORDER):
   Step 4.1: npm run build — Compile TypeScript. Tests cannot be run if the build fails. Fix type errors.
   Step 4.2: npm run test — Run Jest. Ensure that all tests pass, including new ones.
   Step 4.3: npm run prettier — Format code according to .prettierrc.
   Step 4.4: npm run lint — Check ESLint. If there are errors, you are responsible for fixing them yourself, not just reporting them.
4. Coding Standards
   Language: Comments and JSDoc must be in Russian. The wording must be clear and descriptive ("what it does" and "why"), without the formal style.
   Async: All promises must be processed (await or .catch()). "No-floating-promises" are prohibited.
   Performance:
   Avoid creating heavy objects or compiling RegExp inside hot loops. Use caching (see src/utils/standard/Text.ts and RegExp.ts).
   Strictly enforce ReDoS protection. The framework validates RegExp, but you also shouldn't generate vulnerable patterns (e.g., nested quantifiers (a+)+).
   Generated HTTP code and framework HTTP clients must have bounded timeouts. Do not generate or add unbounded fetch/request calls in request handlers.
   Security: Never log tokens or sensitive data in cleartext. Use built-in escaping. Custom loggers must receive masked secrets by default, including nested metadata; an explicit opt-out such as maskSecrets: false may keep raw values only when already supported by the public API.
   Generated artifacts must not persist plaintext tokens in commit-prone files such as serverless.yml, package.json, Dockerfile, README, or source files. Prefer environment variable references and keep real secrets only in ignored local files.
   CLI safety: generators must not silently overwrite user files. Any overwrite of a non-empty output directory requires an explicit force option and tests.
5. Testing Rules (Jest)
   Coverage: Any new logic branch (if, switch, try/catch) or new public method must be covered. Unit tests.
   Isolation: External dependencies (network, filesystem, database) must be locked (jest.fn(), jest.mock()). Do not make real network requests in tests.
   Structure: Test files should be located in the tests/ folder and follow the src/ folder structure. Naming: \*.test.ts.
   CLI tests: changes in cli/flowGenerator.js or cli/templates must be covered in tests/cli/. Generated projects must compile under their generated tsconfig assumptions, and production templates must be tested as user-facing product code.
6. Documentation
   JSDoc: Required for all public classes, methods, interfaces, and types exported externally. Must contain @param, @returns, and @example.
   CHANGELOG.md: If a change adds a new public feature, changes API behavior, or fixes a critical bug, add an entry in the active target release section of CHANGELOG.md (for example, 3.0.15 when that release is being prepared) using the Keep a Changelog format. Use [Unreleased] only when no target release is specified.
7. Forbidden Actions
   Breaking dependency direction (the core does not depend on plugins).
   Breaking backward compatibility of the public API.
   Leaving code that fails npm run build. npm run test, npm run prettier, or npm run lint.
   Write tests that depend on the order of other tests.
   Ignore linter errors, assuming "it doesn't matter."
   If the task is ambiguous or requires violating architectural invariants, stop at the "Plan" stage, ask a clarifying question, and wait for a response.
8. Available Skills (for umbot contributors)
   The following skills are available via `.agents/skills/`. Use them when the task matches their scope:
    - **`umbot-platform-add`** — add a new platform adapter from scratch (skeleton in `src/plugins/platforms/<Name>/`, registration, tests).
    - **`umbot-platform-code-update`** — verify adapters/API-classes against current official platform APIs, plan migration (version bump / new feature / rework).
    - **`umbot-platform-code-audit`** — audit platform adapters for API contract violations (buttons, cards, signatures, limits) with mandatory verification discipline.
    - **`umbot-core-engineer`** — changes in `src/core/` (Bot.ts, AppContext, CommandReg) with backward compatibility checks.
    - **`umbot-add-middleware`** — add middleware in `src/middleware/` (production standards: factory pattern, types, tests, docs).
    - **`umbot-code-audit`** — full code audit of `src/` + `cli/` (security, performance, concurrency) with Senior Review discipline.
    - **`umbot-code-review`** — review of a proposed diff/PR (correctness, invariants, regressions, test quality) before merge.
    - **`umbot-doc-audit`** — documentation audit and refactoring (Markdown + JSDoc), verified against real code.
    - **`umbot-release-prepare`** — run pre-release checklist: build/test/prettier/lint, version bump, CHANGELOG audit, `npm pack` verification.
    - **`umbot-fix-bug`** — workflow for fixing a bug: reproducer test → root cause → minimal fix → regression test.
    - **`umbot-write-tests`** — how to write unit tests and integration tests with `BotTest`, how to stub logger, mock fetch, isolate DB.
9. Platform compatibility matrix (reference for contributors)

    | Platform | Text limit   | Buttons/row | Card types                                | Webhook signature                 |
    | -------- | ------------ | ----------- | ----------------------------------------- | --------------------------------- |
    | Alisa    | 1024         | unlimited   | BigImage, ItemsList, ImageGallery (до 10) | (none)                            |
    | Marusia  | 1024 (≠ ∅)   | unlimited   | BigImage, ItemsList (image_id: int only)  | (none)                            |
    | Telegram | 4096         | unlimited   | Photo, MediaGroup                         | `x-telegram-bot-api-secret-token` |
    | VK       | 4096         | unlimited   | Carousel                                  | `secret_key` in body              |
    | Max      | 4000         | 7x30        | Inline keyboard                           | `x-max-bot-api-secret`            |
    | Viber    | 7000         | 6x7         | RichMedia                                 | `x-viber-content-signature`       |
    | SmartApp | 250 (bubble) | -           | ListCard                                  | (none)                            |

    When changing limits or adding platforms, update this table.

    Verified against official docs (2026-08):
    - **Alisa cards** — the docs do NOT mark `image_id` as required in `ItemsList` or
      `ImageGallery` items (there is no "Обязательный" column at all), and a text-only item
      is a working, field-tested scenario. Do not silently drop items without an image.
      `ItemsList` holds 1–5 items, `ImageGallery` 1–10 (the card spec page says 1–10; the
      response-format overview page still says 1–7 — the spec page is treated as authoritative). Limits: `header.text`/`footer.text` 64,
      `items[].title` 128, `items[].description` 256, `BigImage.description` 1024,
      `button.text` 64, `button.url` 1024 bytes, `button.payload` 4096 bytes.
      `response.text` MAY be empty — but only when `tts` is filled.
      ⚠️ When reading these docs through a summarising tool, verify field-by-field: the
      summariser has reported "Required" for fields the page never marks as required.
    - **Viber rich_media** — a button's `Columns`/`Rows` are its span inside the
      `ButtonsGroupColumns` (1–6, default 6) × `ButtonsGroupRows` (1–7, default 7) grid,
      NOT the number of cards. The `webhook` event sent during `set_webhook` must be
      answered with HTTP 200 or the webhook cannot be registered. Text limit 7000.
    - **MAX** — auth is `Authorization: <token>` for outgoing API requests (query-param tokens are no longer supported); the incoming webhook is verified by the `x-max-bot-api-secret` header (`secret` adapter option, `signatureName` in `Max/Adapter.ts`). Do not confuse the two mechanisms.
      `Content-Type` is required for requests with a body. Up to 12 attachments per message,
      keyboard up to 30 rows / 7 buttons per row (3 for link/open_app/geo/contact).
      Max 2 callback-ответа в секунду на диалог; отправка в один диалог — не чаще 1 сообщения
      в 500 мс (реализовано очередью в `MaxRequest` с таймерами `.unref()`).
    - **VK** — `users.get` документирует только `user_ids` (список через запятую);
      legacy-алиас `user_id` не использовать. У vkpay-кнопки `hash` находится внутри
      `action`, а не на верхнем уровне объекта кнопки; `hash: null` отклоняет всю
      клавиатуру (ошибка 100). `keyboard` и `template` взаимоисключающи;
      `random_id` — int32. Тело запроса к API — `x-www-form-urlencoded`.
    - **Telegram** — `inline_keyboard` — массив массивов; `callback_data` 1–64 байта;
      `url` и `callback_data` взаимоисключающи в одной кнопке. `sendMediaGroup` принимает
      2–10 элементов (одиночное фото — через `sendPhoto`). Upload-операции
      (sendPhoto/sendAudio/sendMediaGroup) требуют таймаут ~30 с, обычные методы — ~5 с.
    - **Marusia** — custom skills were shut down by VK on 2024-12-20 and the protocol docs were removed
      from dev.vk.com; the format was checked against the archived copy. Response requires `session`
      (echo) and a NON-empty `text` (unlike Alisa). Cards: `BigImage {type, image_id:int}`,
      `ItemsList {type, items:[{image_id:int}]}`, `MiniApp`, `Link` — no ImageGallery, no titles/buttons.
      Buttons: only `title`/`url`/`payload` (payload is a JSON object).
    - **Alisa ButtonPressed** — the request has NO `command`/`original_utterance`, only `payload` and
      `nlu.tokens`; button `payload` in the response must be a JSON object (strings are wrapped into
      `{command}`). Health-check `ping` must be answered with a full valid response (`end_session` required).
    - **SmartApp** — `server_action` is `{action_id, parameters}` (`{type, payload}` is deprecated);
      `payload.items` is required in ANSWER_TO_USER; `pronounceText` has no documented length limit.
    - **Telegram voice** — synthesized OGG/Opus goes via `sendVoice`; `sendAudio` accepts only MP3/M4A.
    - **MAX bot_started** — carries `payload` (deep-link) and must be answered (welcome), not skipped.
    - **MAX buttons** — per the official SDK (`@maxhub/max-bot-api`): `quick` exists only on
      `request_geo_location`, `contact_id`/`web_app` only on `open_app`, `payload` on
      `callback`/`clipboard`/`open_app` (never on `link`). `intent` is absent from current docs and
      SDK (TamTam legacy) and is sent only for `callback`.
    - **VK uploads** — photos (`photos.getMessagesUploadServer`) must be uploaded in the multipart
      field `photo`, documents/voice in `file`. `docs.save` returns `{type, doc | audio_message}` —
      ids live in the nested object. Carousel elements must share one structure (same button count)
      and the message text is mandatory with a carousel.
    - **MAX uploads** — the upload-server response for `audio`/`video` is `retval` (not JSON); their
      token comes from the `POST /uploads` step. Never cache the one-time upload `url` as a token.
    - **SpeechKit TTS** — body `application/x-www-form-urlencoded`, auth `Api-Key <key>` or
      `Bearer <IAM>`; the `OAuth` scheme belongs to the Dialogs API only.
    - **Telegram button `style`** — only `danger`, `success`, `primary`.
    - **Viber welcome** — the reply to `conversation_started` goes in the webhook response body;
      REST `send_message` to a not-yet-subscribed user is rejected.
    - **Viber** — тело исходящего запроса к API ограничено 30 КБ (проверяется в
      `ViberRequest.call()`); `rich_media` требует `min_api_version >= 7`.
    - **Request (общее)** — `_getOptions()` возвращает `undefined` при ошибке attach-файла:
      перед `fetch` обязательно проверять результат, иначе уходит паразитный GET-запрос.
      `Request.send()` сбрасывает `attach/post/get/customRequest` после каждого вызова —
      инстанс переиспользуется.

10.1. Platform quirks that are NOT contract violations but bite in production - Any update type Telegram/VK/Viber/MAX sends that the adapter cannot answer must still
return HTTP 200. On 5xx Telegram replays the update forever, VK Callback API disables
the server, and Viber refuses to register the webhook. Unknown events belong in
`skipAutoReply`, never in `setQueryData() === false`. - Alisa, Marusia and SmartApp provide NO webhook signature. Everything in the payload —
including `user_id` — is attacker-controlled. Never interpolate it into a URL or a
query without escaping, and never treat it as an authenticated identity. - `Card.getCards(cardProcessing, controller)` возвращает результат `cardProcessing`
как есть. У Telegram, VK, Алисы, Маруси и MAX процессоры асинхронные — их вызов
обязан быть с `await`; у Viber и SmartApp — синхронные, и лишний `await` там не
нужен. При добавлении платформы сначала определи, async ли твой `cardProcessing`,
и не копируй вызов из чужого адаптера. - Доступ к `button.options` в адаптерах — только через `?.` (или `?? {}`):
компонент `Buttons` всегда задаёт `options`, но кнопка может прийти объектом,
собранным вручную вне компонента (JS-потребители, тесты). Образец — Telegram/VK/Max/Viber.

10. Anti-patterns — what NOT to do
    1. ❌ Do not reassign `ctx.userData = {...}` — merge keys instead (`Object.assign(ctx.userData, ...)` or direct assignments).
    2. ❌ Do not create `setTimeout`/`setInterval` without `.unref()` in library code — it blocks `process.exit()`.
    3. ❌ Do not call `console.log`/`console.error` directly in `src/` — always use `AppContext.logError`/`logWarn`/`log`.
    4. ❌ Do not return `null` where Promise<T> is declared without catching callers — use explicit `null` returns only where documented.
    5. ❌ Do not modify `ctx.requestObject` — it's the platform's raw payload, treat as read-only.
    6. ❌ Do not remove public methods from `src/index.ts` or signatures — treat as breaking change requiring major version bump and CHANGELOG entry.
    7. ❌ Do not use `eval`, `Function()`, `new Function()` in runtime code — ReDoS/injection risk.
    8. ❌ Do not create a file lock on `FileAdapter` — it's documented as single-process.
