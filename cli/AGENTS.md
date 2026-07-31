# CLI — AGENTS.md

> Инструкции для AI-агента, работающего с CLI генератором umbot-проектов.

## Что делает CLI

CLI берёт `flow.json` (экспорт из visual editor) и генерирует готовый TypeScript-проект umbot.

**Команда:**

```bash
npx umbot create from-flow flow.json --output ./my-bot
```

**Результат:**

```
my-bot/
├── src/
│   ├── index.ts    # Готовый код бота
│   └── utils.ts    # Вспомогательные функции setText/setTTS
├── package.json
└── tsconfig.json
```

## Файлы

| Файл               | Назначение                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `flowGenerator.js` | Основной генератор. Читает JSON, генерирует `src/index.ts`, `src/utils.ts`, `package.json`, `tsconfig.json`. |
| `umbot.js`         | Точка входа CLI (`npx umbot create from-flow`).                                                              |

Тесты: `tests/cli/flowGenerator.test.ts` (Jest, 38 тестов).

## Архитектура генератора

### Ключевые функции

| Функция                                        | Назначение                                                                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `escapeStr(s)`                                 | Экранирует строки (кавычки, бэктики, $, переносы).                           |
| `isValidJSIdentifier(name)`                    | Проверяет, является ли строка валидным JS-идентификатором.                   |
| `userDataAccess(name)`                         | Безопасное обращение к userData: `ctrl.userData.x` или `ctrl.userData['x']`. |
| `textExpr(text)`                               | Конвертирует `{{var}}` → `` `${ctrl.userData.var}` `` (template literal).    |
| `collectVarNames(doc)`                         | Собирает имена переменных из всех узлов.                                     |
| `resolveVars(expr, varNames)`                  | Заменяет имена переменных на `ctrl.userData.name` в выражениях.              |
| `generateActionFunc(block, varNames, indent)`  | Генерирует код действия (set_variable, random_number, http_request).         |
| `generateConditionFunc(cond, ...)`             | Генерирует `if/else` из условия (7 параметров).                              |
| `generateButtonCode(buttons, indent, shuffle)` | Генерирует `addBtn()` / `addLink()`.                                         |
| `generateCardCode(card, indent)`               | Генерирует `card.addImage()`.                                                |
| `generateBlockFunc(block, ...)`                | Генерирует функцию `__name(ctrl)` из блока (5 параметров).                   |
| `findNextNonBlockNode(doc, fromId)`            | Ищет следующий command/step в цепочке (лимит 20).                            |
| `generateIndexTs(doc)`                         | Главная функция. Генерирует полный `src/index.ts`.                           |
| `generateUtils()`                              | Генерирует `src/utils.ts` с setText/setTTS.                                  |
| `generatePackageJson(doc)`                     | Генерирует `package.json`.                                                   |
| `generateTsConfig()`                           | Генерирует `tsconfig.json`.                                                  |
| `generateFromFlow(flowJsonPath, outputPath)`   | Точка входа: читает JSON, вызывает все генераторы, записывает файлы.         |

### Поток генерации

```
generateFromFlow(jsonPath, outputPath)
├── Читает и валидирует JSON
├── collectVarNames(doc)           → список имён переменных
├── connectedBlocks                → найти связанные блоки
├── generateIndexTs(doc)           → src/index.ts
│   ├── Импорты                   → Bot, platforms, adapter, rand, Text, setText/setTTS
│   ├── bot.use(fullPlatforms)    → платформы
│   ├── bot.use(Adapter())        → адаптер БД
│   ├── bot.setAppConfig()        → isLocalStorage
│   ├── bot.setPlatformParams()   → welcome, help, fallback
│   ├── generateBlockFunc()       → функции __name(ctrl) для standalone блоков
│   ├── Commands                  → bot.addCommand()
│   │   ├── generateActionFunc()  → инлайн действия
│   │   ├── generateConditionFunc() → инлайн условия (с поддержкой thisIntentName для step/command)
│   │   ├── generateButtonCode()  → кнопки
│   │   ├── generateCardCode()    → карточки
│   │   └── findNextNonBlockNode() → thisIntentName
│   ├── Steps                     → bot.addStep()
│   │   └── (аналогично commands)
│   └── Fallback                  → bot.addCommand(FALLBACK_COMMAND, ...)
├── generateUtils()               → src/utils.ts
├── generatePackageJson(doc)      → package.json
└── generateTsConfig()            → tsconfig.json
```

### Правила генерации

1. **Блоки** (action/condition/response) → переиспользуемые функции `__name(ctrl)`.
2. **Команды** вызывают функции блоков, затем навигируют.
3. **Шаги** сохраняют ввод, вызывают функции, навигируют.
4. **Навигация** — `thisIntentName` указывает ТОЛЬКО на command/step.
5. **Условия** — генерируют `if/else` с inline-кодом или вызовом функций.
6. **Branch → step/command** — генерируется `ctrl.thisIntentName = 'name'` (а не `__name(ctrl)`).
7. **Branch → response/action/condition** — генерируется `__name(ctrl)`.
8. **Переменные** — `{{name}}` → `` `${ctrl.userData.name}` `` (template literal).
9. **Текст** — экранирование `` ` `` и `$` перед оборачиванием в template literal.
10. **set_variable** — текст оборачивается в кавычки, переменные/числа остаются как есть.
11. **resolveVars** — escapeRegExp для спецсимволов, longest-first sort.

### Исправленные баги

- **textExpr** — экранирование `` ` `` и `${` в шаблонных литералах.
- **resolveVars** — escapeRegExp для спецсимволов в именах переменных.
- **HTTP headers** — передаются в fetch через fetchOpts.
- **isNotEmpty** — добавлен case в switch.
- **needsText** — убрана проверка кнопок, проверяет только isSay\*/isUrl.
- **setTTS** — условный импорт через needsTTS.
- **helpText** — берётся из doc.helpText.text, fallback как запас.
- **branch → step/command** — генерируется thisIntentName вместо несуществующей функции.

## Тесты

```bash
npx jest tests/cli/flowGenerator.test.ts
```

### Паттерны (38 тестов)

| #       | Паттерн                 | Что проверяется                                |
| ------- | ----------------------- | ---------------------------------------------- |
| 1       | Простая команда         | `addCommand`, `setText`                        |
| 2       | Кнопки                  | `addBtn`, `addLink`                            |
| 3       | Шаг с saveTo            | `saveTo`, `userCommand`                        |
| 4       | Инлайн action (rand)    | `rand()`, импорт                               |
| 5       | Условие (блок)          | Функция `__check(ctrl)`                        |
| 6       | Навигация               | `thisIntentName`                               |
| 7       | Полный цикл             | command → action → step → condition            |
| 8       | Карточка                | `card.addImage`                                |
| 9       | TTS                     | `setTTS`                                       |
| 10      | HTTP                    | `async fetch`                                  |
| 11      | Response блок           | `__help(ctrl)` вызов                           |
| 12      | Карточка в response     | Много изображений                              |
| 13      | isEnd                   | `ctrl.isEnd = true`                            |
| 14      | set_variable expression | `resolveVars`                                  |
| 15      | isEmpty                 | `!ctrl.userData.x`                             |
| 16      | saveAs lowercase        | `toLowerCase()`                                |
| 17      | Мульти-шаг цепочка      | 3 шага подряд                                  |
| 18      | Операторы               | gt, lt, contains, neq                          |
| 19      | Inline condition        | if/else в command                              |
| 20      | Кнопки в шаге           | `addBtn` в addStep                             |
| 21      | Ошибки                  | Missing file, invalid JSON, missing name/nodes |
| 22      | Welcome/fallback        | Тексты приветствия                             |
| 23      | set_variable текст      | 'Hello world' → 'Hello world' (в кавычках)     |
| 24      | isNotEmpty              | `!!condVar && condVar !== ''`                  |
| 25      | helpText vs fallback    | helpText.text имеет приоритет                  |
| 26      | Branch → step           | thisIntentName вместо \_\_name(ctrl)           |
| db      | FileAdapter             | Импорт и использование                         |
| dbmongo | MongoAdapter            | Импорт и использование                         |
| dbnone  | Без адаптера            | Нет импорта                                    |
| edge    | Backticks               | Экранирование `` ` `` в тексте                 |
| edge    | ${}                     | Экранирование $ в тексте                       |
| edge    | Пустые {{}}             | Не ломает шаблонный литерал                    |
| edge    | Переменная с точкой     | Скобочный синтаксис `['user.name']`            |
| edge    | Backticks + {{var}}     | Смешанное экранирование                        |
