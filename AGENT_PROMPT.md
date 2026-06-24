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
2. Architectural Invariants (Strict Rules)
   Dependency Direction: Modules from src/plugins/ MAY import from src/core/, src/components/, and src/utils/. Modules from src/core/ or src/components/ MUST NOT import anything from src/plugins/.
   Public API Stability: Changing method signatures, class names, or removing exports from src/index.ts and other public entry points (src/plugins.ts, src/build.ts) is prohibited. Doing so will break code for library users. Any extension must be backwards compatible.
   Encapsulation: Use private fields (#field) for internal class state. The "any" type is prohibited. Use "unknown" with type narrowing or strict interfaces.
3. Workflow (Strict Algorithm)
   When you receive a code modification task, perform the steps strictly in the specified order. Do not proceed to the next step if the previous one is not completed successfully.
   Analysis: Identify the affected files using the structure map from Section 1.
   Plan: Formulate a brief plan of changes (which files, what logic).
   Modification: Make the changes to the code.
   Verification (STRICT ORDER):
   Step 4.1: npm run build — Compile TypeScript. Tests cannot be run if the build fails. Fix type errors.
   Step 4.2: npm run test — Run Jest. Ensure that all tests pass, including new ones.
   Step 4.3: npm run prettier — Format code according to .prettierrc.
   Step 4.4: npm run lint — Check ESLint. If there are errors, you are responsible for fixing them yourself, not just reporting them.
4. Coding Standards
   Language: Comments and JSDoc must be in Russian. The wording must be clear and descriptive ("what")."does" and "why"), without the formal style.
   Async: All promises must be processed (await or .catch()). "No-floating-promises" are prohibited.
   Performance:
   Avoid creating heavy objects or compiling RegExp inside hot loops. Use caching (see src/utils/standard/Text.ts and RegExp.ts).
   Strictly enforce ReDoS protection. The framework validates RegExp, but you also shouldn't generate vulnerable patterns (e.g., nested quantifiers (a+)+).
   Security: Never log tokens or sensitive data in cleartext. Use built-in escaping.
5. Testing Rules (Jest)
   Coverage: Any new logic branch (if, switch, try/catch) or new public method must be covered. Unit tests.
   Isolation: External dependencies (network, filesystem, database) must be locked (jest.fn(), jest.mock()). Do not make real network requests in tests.
   Structure: Test files should be located in the tests/ folder and follow the src/ folder structure. Naming: \*.test.ts.
6. Documentation
   JSDoc: Required for all public classes, methods, interfaces, and types exported externally. Must contain @param, @returns, and @example.
   CHANGELOG.md: If a change adds a new public feature, changes API behavior, or fixes a critical bug, add an entry in the [Unreleased] section of the CHANGELOG.md file using the Keep a Changelog format.
7. Forbidden Actions
   Breaking dependency direction (the core does not depend on plugins).
   Breaking backward compatibility of the public API.
   Leaving code that fails npm run build. npm run test, npm run prettier, or npm run lint.
   Write tests that depend on the order of other tests.
   Ignore linter errors, assuming "it doesn't matter."
   If the task is ambiguous or requires violating architectural invariants, stop at the "Plan" stage, ask a clarifying question, and wait for a response.
