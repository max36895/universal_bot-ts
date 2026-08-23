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

### Шаг 4: Пиши unit-тестЫ

В `tests/Platforms/<Name>/adapter.test.ts` необходимы:

- `setQueryData` корректно маппит query → controller field
- `isCorrectQuery` отклоняет невалидный payload
- `isCorrectQuery` пропускает валидный
- `getContent` формирует корректный формат платформы
- Кнопки преобразуются в формат платформы
- Пустые ответы обрабатываются без падения

### Шаг 5: Добавь регистрацию

- `src/plugins/platforms/index.ts` — `export { <Name>Adapter, T_<NAME> } from './<Name>/Adapter'`
- `src/plugins/platforms/index.ts` — добавь `<Name>Adapter` в `fullPlatforms/botPlatforms/chatPlatforms` если применимо
- `src/plugins/platforms/Base/<Name>Request.ts` — публичный API-класс
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
4. ❌ **Не делай async без ожидания**. Все `Promise` должны быть обработаны.
5. ❌ **Не пиши тесты, зависящие от реальной сети.** Все fetch должны быть замоканы.

## Ссылки

- Базовый класс: `src/plugins/platforms/Base/Base.ts`
- Хороший пример (простейший): `src/plugins/platforms/Max/Adapter.ts`
- Средняя сложность: `src/plugins/platforms/Viber/Adapter.ts`
- Сложный (со звуком и загрузкой): `src/plugins/platforms/Telegram/Adapter.ts`

## Success criteria

Ты закончил, когда:

1. ✅ Новый адаптер интегрируется через `bot.use(new <Name>Adapter(token))`
2. ✅ Все 700+ существующих тестов проходят
3. ✅ Есть минимум 5 новых тестов на adapter
4. ✅ CHANGELOG обновлён
5. ✅ Линтер чистый (0 errors)
