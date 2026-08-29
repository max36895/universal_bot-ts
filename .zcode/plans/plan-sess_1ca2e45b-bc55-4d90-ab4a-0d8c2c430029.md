# План: Аудит тестового покрытия umbot + приведение тестов к целевому состоянию

## Что я уже разведал (390+ тестов, 40 файлов, ветка v-3.0.0)

### Текущее состояние (краткое резюме карты)

| Зона                                                       | Файлов        | Оценка                                                                                                                 |
| ---------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `tests/Bot/*`                                              | 5 (60 тестов) | Хорошо, но тесты мокают `AlisaAdapter.getRatingContext` и не проверяют реальный payload                                |
| `tests/Buttons, Card, Text, Nlu, Navigation, Image, Sound` | 7             | Базово покрыто; есть сломанные assertion’ы и дубли                                                                     |
| `tests/Middleware/*`                                       | 2 (22)        | Один из лучших сьютов                                                                                                  |
| `tests/Platforms/{Alisa, Telegram, VK, Viber}`             | 7 (96)        | Viber лучший, VK куций (9 тестов), Marusia/Max/SmartApp **отсутствуют**                                                |
| `tests/Platforms/{Marusia, Max, SmartApp}`                 | 0             | **Не покрыто вовсе** — P0                                                                                              |
| `tests/Request/*`                                          | 9 (61)        | HTTP-слой покрыт; **базовый `Request.ts` и его таймауты не проверяются**                                               |
| `tests/DbModel/*`                                          | 2             | File+Mongo, но Mongo завязан на живой инстанс (timeout 3с)                                                             |
| `tests/cli/*`                                              | 3 (79)        | flowGenerator покрыт прилично (56)                                                                                     |
| `tests/Performance/*`                                      | 1             | GC-тесты Bot                                                                                                           |
| **Отсутствуют полностью**                                  | —             | `src/build.ts`, `src/Preload.ts`, тесты маскирования токенов, тесты `CommandReg` напрямую, тесты таймаута HTTP-клиента |

### Ключевые находки (проведена верификация)

1. **Сломанный assertion**: `tests/Nlu/nlu.test.ts:82` — `expect(Nlu.getPhone('8(999).toBe(true)999-99-99').status);` — matcher попал внутрь строки, matcher не вызван, тест проходит "молча".
2. **Вторая опечатка**: `tests/Nlu/nlu.test.ts:192` — в блоке `isIntentReject` последняя проверка вызывает `isIntentConfirm('да')` вместо `isIntentReject`.
3. **Порядок-тестирование**: `tests/Controller/controller.test.ts` мутирует `appContext.platformParams.intents` на уровне модуля → тесты зависят от порядка. `tests/Nlu/nlu.test.ts` делит один `nlu`-объект между `isIntentConfirm` и `isIntentReject`.
4. **Секреты не защищены тестами**: в `src/core/AppContext.ts:683-729` реализовано маскирование regex-токенов (telegram `bot...`, VK `vk1a...`, nested meta, circular refs, OptOut `maskSecrets: false`) — **ни один тест это не проверяет**.
5. **Viber HMAC-подпись**: `src/plugins/platforms/Viber/Adapter.ts:53` объявляет `x-viber-content-signature`, базовый `isCorrectQuery` в `src/plugins/platforms/Base/Base.ts:203` реализует HMAC-SHA256 — но в `tests/Platforms/Viber/adapter.test.ts` нет ни одного negative-кейса с неверной подписью (в отличие от Telegram и VK, где это покрыто).
6. **Матрица лимитов AGENTS.md не закреплена**: в коде есть `Text.resize(controller.text, 1024/4096/4000/250)` в 5 адаптерах, но ни один adapter-тест **не проверяет**, что текст обрезается именно до этих порогов, и не проверяет Viber grid 7x6.
7. **Таймауты HTTP**: `src/api/request/Request.ts:211` использует `AbortSignal.timeout(this.maxTimeQuery)` — нет тестов на realese/timeout.
8. **Mongo-тесты зависят от живого MongoDB** (`tests/DbModel/dbModel.test.ts`, timeout 3000) — нет skip-guard.
9. **Циклы-«набивки» покрытия**: `tests/BotTest/bot.test.ts` генерирует ~80 тривиальных тестов через `for (let i=1; i<10)`; подменяет `httpClient` пустым `{}` и проверяет **контроллерский** `text`, не реальный payload.
10. **Дубли**: `Buttons/buttons.test.ts` ≈ `Platforms/Telegram/button.test.ts`, `Card.test.ts` — Alisa ≈ Marusia дословно.
11. **Пороги покрытия отсутствуют** в `jest.config.js` — регрессии coverage не ловятся.

---

## План работ (фазы строго последовательно, согласно AGENTS.md §3)

### Фаза 1 — Критические исправления (P0, блокеры)

Цель: исправить сломанные/ложные assertion’ы и закрыть самые опасные дыры **без изменения публичного API**.

1. **`tests/Nlu/nlu.test.ts:82`** — вынести `.toBe(true)` из строкового литерала наружу, зафиксировать реальное поведение для `8(999)999-99-99`.
2. **`tests/Nlu/nlu.test.ts:192`** — исправить `isIntentConfirm('да')` → корректную проверку `isIntentReject` для отказа.
3. **Новый `tests/Core/AppContext/maskSecrets.test.ts`**: для каждого из 5 паттернов `PATTERNS` (telegram `bot{35+}`, vk1a{79}, `access_token`/`vk_secret_key`/etc., произвольный base64/hex 30-256, 64-256 hex) — тестируем замену. Отдельно: nested meta (`#maskUnknown` рекурсия), `Error` (`message + stack`), `Date`, циклические ссылки `[Circular]`, opt-out `maskSecrets: false`. Используем `AppContext.setLogger` + шпиона, проверяем, что реальный токен **не** попал в `logger.error`.
4. **`tests/Platforms/Viber/adapter.test.ts`**: добавить `describe('isCorrectQuery')` — positive (валидный HMAC-SHA256 от body), negative (невалидный/пустой header, несовпадение подписей). Параллельно Telegram/VK.
5. **`tests/Platforms/Telegram/adapter.test.ts` + `tests/Platforms/VK/adapter.test.ts`**: проверить, что у существующих negative-тестов (заголовок отсутствует, token mismatch) assertions действительно проверяют не `isPlatformOnQuery`, а `isCorrectQuery` — если нет, добавить.
6. **`tests/api/Request.timeout.test.ts`** (новый): unit-тест `src/api/request/Request.ts` — замокать `AbortSignal.timeout` и/или спровоцировать abort, проверить: (а) таймаут > 0 по умолчанию, (б) при зависшем fetch вызов «вылетает» по abort-сигналу, (в) `maxTimeQuery` настраиваем.

### Фаза 2 — Покрытие незакрытых критических модулей (P0-P1)

7. **Adapters для Marusia / Max / SmartApp** (по образцу `tests/Platforms/Telegram/adapter.test.ts`):
    - `tests/Platforms/Marusia/adapter.test.ts`: isPlatformOnQuery, webhook body → controller (текст, tts в 1024), session/state, BigImage Card.
    - `tests/Platforms/Max/adapter.test.ts`: isPlatformOnQuery (access_token), `Text.resize(4000)` enforcement, inline-keyboard.
    - `tests/Platforms/SmartApp/adapter.test.ts`: SmartApp-формат, лимит 250 на bubble, ListCard.
8. **Дополнить недостающие компоненты платформ** (минимальный smoke-набор):
    - `tests/Platforms/{Alisa, VK, Viber}/{button,card,sound}.test.ts` — по аналогии с Telegram. Достаточно happy path + 1-2 negative кейса.
9. **Матрица AGENTS.md в тестах** (по одному кейсу на платформу):
    - `Alisa`: `Text.resize` до 1024 в Adapter. Документировать 1000/1024 — проверить соответствие кода и AGENTS.md, при расхождении исправить в одном месте.
    - `Telegram`: 4096, `VK`: 4096, `Max`: 4000, `SmartApp`: 250 bubble.
    - `Viber`: подтвердить/зафиксировать grid 7x6 в RichMedia.
10. **`tests/Core/CommandReg.test.ts`** (новый, юнит): fuzzy-matching, приоритеты команд, repeat-команд, повторная регистрация — вне Bot-интеграции.
11. **`tests/build.test.ts`** (smoke): mock-тест `run()` из `src/build.ts` — stubbed Bot, без реального сервера, проверить инициализацию.

### Фаза 3 — Качество существующих тестов (P1, отдельные PR-порции)

12. **`tests/BotTest/bot.test.ts`**:
    - Убрать циклы-генераторы одинаковых тестов (заменить на табличный ряд с различными тест-кейсами).
    - Добавить проверку платформенных payload: для 2-3 ключевых платформ (Telegram, Alisa, VK) проверять наличие `chat_id`, `response.text`, `method` в исходящем JSON, а не только контроллерское поле.
13. **`tests/Controller/controller.test.ts`** — изолировать состояние: каждый `it` создаёт свой `appContext` и `MyController`; убрать зависимость от порядка; `removeCommand` — в `afterEach`.
14. **`tests/Bot/bot.test.ts`**:
    - Заменить `jest.resetAllMocks()` → `jest.restoreAllMocks()` в afterEach; выстроить жизненный цикл spy корректно (re-`mockResolvedValue` в `beforeEach`, не в теле теста).
    - Везде, где читаются/пишутся реальные файлы (`UsersData.json`) — использовать `tmpdir()` + `platformParams.json` в tmp, `afterAll` cleanup через `fs.rm`.
    - Убрать мок `AlisaAdapter.prototype.getRatingContext`, где это возможно — вместо мока проверить реальный payload.
    - 50000-командный «metric»-тест → в `tests/Performance/`, не в основной suite.
15. **Убрать дубли**:
    - Из `tests/Buttons/buttons.test.ts` вынести платформо-агностичные сценарии в один `describe`, платформо-специфичные — оставить в `tests/Platforms/<X>/button.test.ts`. Удалить пересечения.
    - В `tests/Card/card.test.ts` — выделить общий helper для Alisa/Marusia и оставить только различия.
16. **`tests/DbModel/dbModel.test.ts`** — добавить skip-guard для Mongo (`describe.skipIf(!process.env.RUN_MONGO_TESTS)` или runtime probe), регрессий нет, но локальный `npm test` не должен падать.
17. **Negative-сценарии для SmartApp / TelegramButton / Card / Sound** (по 2-3 кейса на каждый модуль).

### Фаза 4 — Инфраструктура (P1)

18. **`jest.config.js`**: добавить `coverageThreshold: { global: { branches: 70, functions: 75, lines: 80, statements: 80 } }` (стартовые значения — подкрутим по факту после запуска) — не выше реально достигнутого, чтобы CI стал сигналом, а не шумом.
19. **`eslint.config.js` (опционально)**: включить `eslint-plugin-jest` только для `tests/**` (правила `valid-expect`, `no-conditional-expect`, `no-identical-title`, `prefer-to-be`) — отловит будущие «сломанные assert-ы».
20. **`AGENTS.md` дополнить** (маленькая правка): зафиксировать «тесты без assertion — баг», «используем `restoreAllMocks` в afterEach» — для будущих контрибьюторов.

---

## Что изменится / не изменится

**Изменяется** (файлы в `tests/`, `jest.config.js`):

- ~6 существующих тестов (nlu, controller, bot, botTest, card, buttons) — точечные правки, без изменения их смысла.
- ~8-12 новых тестов (maskSecrets, Viber HMAC negative, Request timeout, CommandReg, Marusia/Max/SmartApp adapters, build.ts smoke, и компонентные smoke-тесты для Alisa/VK/Viber).
- 2 конфига (`jest.config.js` + `eslint.config.js`), опционально 1 строка в `AGENTS.md`.

**НЕ изменяется**:

- Исходники `src/**` — не трогаем. Если в ходе работы выявится баг в src (а не тесте) — выношу в план отдельным пунктом, фиксим отдельно через `umbot-fix-bug`-workflow.
- `cli/**` — не меняем (там свои тесты в порядке).
- Публичный API — полностью backward compatible.

## Обязательная верификация после каждой фазы (AGENTS.md §3)

1. `npm run build` — tsc без ошибок.
2. `npm run test` — все тесты зелёные.
3. `npm run prettier` — форматирование.
4. `npm run lint` — без новых ошибок.
5. `npm run test:coverage` — проверить, что пороги (если введены) выполняются.

## Ожидаемый итог

- Все 5 P0-дыр закрыты тестами (маскирование, Viber HMAC, таймауты HTTP, SmartApp/Marusia/Max adapters, CommandReg).
- 0 сломанных assertion’ов (`expect(...)` без matcher), 0 опечаток в имени вызываемой функции.
- Тесты соответствуют AGENTS.md-матрице лимитов (1024/4096/4000/250/7x6).
- Пороги coverage зафиксированы, регрессии отлавливаются.
- Ни одного теста, зависящего от порядка выполнения.

## Открытые вопросы перед стартом

1. **Фаза 4 (coverageThreshold + eslint-plugin-jest)** — включать в этот PR или вынести в отдельный? Рекомендую: `coverageThreshold` сразу, `eslint-plugin-jest` — отдельным PR.
2. При нахождении **расхождений между кодом и AGENTS.md-матрицей** (например, Alisa реально 1000 а не 1024) — правим матрицу в `AGENTS.md` или код в адаптере? Рекомендую: правим более консервативную сторону и добавляем CHANGELOG-запись.
