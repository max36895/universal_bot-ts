---
name: umbot-platform-add
description: 'Добавить новую платформу в umbot (новый адаптер)'
---

# Platform Add: скилл для добавления новой платформы

## Назначение

Добавить адаптер для новой платформы в `src/plugins/platforms/<Name>/`. Скилл проводит
пошагово: от анализа API платформы до готовых файлов и тестов.

## Триггер

- "добавь платформу X"
- "нужна поддержка WhatsApp / Discord / MatterMost"
- "платформа X появилась, надо адаптер"

## Workflow (строго по шагам)

### Шаг 0: Собери требования у автора

Спроси:

1. Как называется платформа коротким именем (для T\_<NAME>)? (латиница, snake_case)
2. Webhook или polling? (если оба — начнём с webhook)
3. Какой тип авторизации? (бот-токен в URL, header, HMAC signature)
4. Какой формат кнопок? (inline/reply/custom — для понимания Adapter)
5. Есть ли карточки/галереи/аудио?
6. Есть ли служебные события (user joined, message deleted)?

Если автор не знает деталей — попроси дать JSON of запроса/ответа из API документации.

### Шаг 1: Изучи API платформы

Прочитай официальную документацию. Выяви:

- Формат webhook payload (message/user/callback structure)
- Метод отправки ответа (какой endpoint? what params?)
- Лимиты (длина текста, размер attachments, кнопок per row, callback_data)
- Требования к авторизации

### Шаг 2: Создай каркас — `src/plugins/platforms/<Name>/`

Скопируй структуру от аналогичной платформы (например, от Max):

```
<Name>/
├── Adapter.ts        # extends BasePlatform<TContent>
├── Button.ts         # buttonProcessing
├── Card.ts           # cardProcessing
├── Sound.ts          # soundProcessing
├── constants.ts      # T_<NAME>, VERSION, ERROR_MESSAGES
└── interfaces/
    └── I<Name>Platform.ts  # входящий формат updates
```

И отдельно:

```
src/plugins/platforms/API/<Name>Request.ts  # HTTP клиент к API
```

### Шаг 3: Определи контракты

В `Adapter.ts` реализуй:

- `platformName` — короткий идентификатор (латиница, snake_case)
- `isVoice` — поддерживает ли голосовой ввод
- `limit` — платформенный rate limit (запросов/сек)
- `signatureName` — имя заголовка для проверки подписи (если есть — иначе `undefined`)
- `init(appContext)` — запись токена и секретов в конфиг
- `isPlatformOnQuery(query, headers)` — детектор запроса этой платформы
- `setQueryData(query, controller)` — универсальный mapping в BotController
- `getContent(controller)` — формирование ответа в формате платформы
- `isCorrectQuery(query, headers)` — проверка подписи (может переопределять Base)

⚠️ Нюанс `Card.getCards(cardProcessing, controller)`: метод возвращает результат
`cardProcessing` как есть. Если твой `cardProcessing` асинхронный (Telegram, VK,
Alisa, Marusia, Max) — вызов обязан быть с `await`. Если синхронный (Viber,
SmartApp) — `await` не нужен. Определи это до написания `getContent` и не копируй
вызов из чужого адаптера вслепую.

⚠️ Лимиты и форматы проверяй по официальной документации платформы и заноси
подтверждённые факты в таблицу/раздел «Verified» в `AGENTS.md` (см. раздел 9).

### Шаг 4: Пиши unit-тестЫ

В `tests/Platforms/<Name>/adapter.test.ts` необходимы:

- `setQueryData` корректно маппит query → controller field
- `isCorrectQuery` отклоняет невалидный payload
- `isCorrectQuery` пропускает валидный
- `getContent` формирует корректный формат платформы
- Кнопки преобразуются в формат платформы
- Пустые ответы обрабатываются без падения

### Шаг 5: Добавь регистрацию

- `src/plugins/index.ts` — экспорт `<Name>Adapter`, `T_<NAME>` и API-класса (`export * as <Name>Button from './platforms/<Name>/Button'` и т.п.)
- `src/plugins/platforms/adapters.ts` — добавь адаптер в список `adapters` (его используют `fullPlatforms`/`botPlatforms`/`voicePlatforms`)
- Проверь, что нет конфликтов имен (T_X, T_Y) и дублирования констант

### Шаг 6: Обнови документацию

- `src/docs/getting-started.md` — пример с новым адаптером
- `README.md` — добавь платформу в список поддерживаемых
- `CHANGELOG.md` — запись в `[Unreleased]` или `[target-version]`

### Шаг 7: Прогон verification

```bash
npm run build
npm run test
npm run prettier
npm run lint
```

Все должны пройти. Если падает — чини, не скипай.

## Anti-patterns — НЕ делай так

1. ❌ **Не импортируй из plugins/ в core/.** Платформа не должна менять ядро.
2. ❌ **Не пиши `any`**. Используй строгие интерфейсы. Если API возвращает unknown - narrow.
3. ❌ **Не добавляй в публичный API необоснованных параметров**. Если параметр нужен только тебе - это protected.
4. ❌ **Не делай async без ожидания**. Все `Promise` должны быть обработаны (и см. нюанс `getCards` выше).
5. ❌ **Не пиши тесты, зависящие от реальной сети.** Все fetch должны быть замоканы.
6. ❌ **Не обращайся к `button.options` без `?.`** (или `?? {}`). Компонент `Buttons` всегда его задаёт, но кнопка может прийти объектом, собранным вручную — TypeError в `getContent` даёт 500 платформе. Образцы: Telegram/VK/Max/Viber.
7. ❌ **Не вставляй payload в JSON платформы напрямую.** Используй `serializePlatformPayload` (сериализация с логированием несериализуемых значений) и `tryParse` из `src/plugins/platforms/Base/utils.ts`.
8. ❌ **Не отправляй запрос без проверки `_getOptions()`/attach.** `Request._getOptions()` возвращает `undefined` при ошибке attach — проверяй перед `fetch` (см. `Request.ts`).
9. ❌ **Не возвращай `false` из `setQueryData` для служебных событий.** На `4xx/5xx` платформы включают ретраи и отключают вебхук — такие события помечаются `skipAutoReply` (см. раздел 10.1 AGENTS.md).

## Ссылки

- Базовый класс: `src/plugins/platforms/Base/Base.ts`
- Хороший пример (простейший): `src/plugins/platforms/Max/Adapter.ts`
- Средняя сложность: `src/plugins/platforms/Viber/Adapter.ts`
- Сложный (со звуком и загрузкой): `src/plugins/platforms/Telegram/Adapter.ts`

## Success criteria

Ты закончил, когда:

1. ✅ Новый адаптер интегрируется через `bot.use(new <Name>Adapter(token))`
2. ✅ Все существующие тесты проходят (~1300 на 3.1.0)
3. ✅ Есть минимум 5 новых тестов на adapter
4. ✅ CHANGELOG обновлён, AGENTS.md матрица платформ дополнена
5. ✅ Линтер чистый (0 errors)
