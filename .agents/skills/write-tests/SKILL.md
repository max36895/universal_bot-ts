---
name: umbot-write-tests
description: 'Правила написания unit и integration тестов для umbot'
---

# Write Tests: скилл для написания тестов в umbot

## Назначение

Определяет стандарт написания тестов для фреймворка umbot. Цель — тесты, которые
стабильны, не засоряют консольный вывод, изолированы от внешних зависимостей.

## Триггер

- "Пишу тесты для X"
- "Как протестировать Y"
- "Новая фича — нужны тесты"

## Общие правила (MUST)

### 1. Всегда stub-ай логгер в setUp

По умолчанию `Bot` создаёт `AppContext`, который пишет логи в консоль и в `logs/`.
В тестах это засоряет output и может создавать файлы.

**Не делай так:**

```ts
const bot = new Bot(); // будет писать в консоль
```

**Делай так:**

```ts
const bot = new Bot();
bot.setLogger({
    log: () => {},
    error: () => {},
    warn: () => {},
});
```

Или, если нужен доступ к log записям:

```ts
const errorLogs: string[] = [];
bot.setLogger({
    log: () => {},
    error: (msg) => {
        errorLogs.push(msg);
    },
    warn: () => {},
});
```

### 2. Mock fetch/HTTP — никогда не делай реальных сетевых вызовов

Плохо:

```ts
await request.send('https://api.telegram.org/bot123/sendMessage'); // Реальный вызов!
```

Хорошо:

```ts
(global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ ok: true, result: { message_id: 1 } }),
});
```

Для VK/Alisa используй те же паттерны с перехватом fetch.

### 3. Отключи DB-адаптеры

Если тест не про БД — НЕ подключай FileAdapter/MongoAdapter. Иначе тесты полезут на диск.

```ts
// Без БД
bot.setAppConfig({ isLocalStorage: true });
```

Если нужен Mongo — mock коннект:

```ts
jest.mock('../../src/plugins/db/Mongo/Adapter', () => ({
    MongoAdapter: jest.fn().mockImplementation(() => ({
        init: jest.fn(),
        isConnected: jest.fn(() => true),
        select: jest.fn(() => ({ status: true, data: null })),
        save: jest.fn(() => true),
    })),
}));
```

### 4. Изолируй тест — каждый тест самодостаточен

Не зависят от порядка выполнения, предыдущих вызовов, глобальных синглтонов. Если нужен шаринг — используй `beforeEach` для инициализации и `afterEach` для очистки.

### 5. Запрещены реальные токены

Заменяй на `'*'.repeat(10)` или `process.env.TEST_TOKEN ?? 'fake-token'`.

```ts
// ПЛОХО
const bot = new Bot().use(new TelegramAdapter('123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'));

// ХОРОШО
const bot = new Bot().use(
    new TelegramAdapter('bot123:********************************************'),
);
```

## Структура тестов

### Unit (для utils, middleware, helpers)

Файл: `tests/<Area>/<Name>.test.ts`

```ts
import { myUtil } from '../../src/utils/myUtil';

describe('myUtil', () => {
    it('возвращает X когда ...', () => {
        expect(myUtil('a')).toBe('expected');
    });

    it('бросает ошибку когда ...', () => {
        expect(() => myUtil(null as any)).toThrow();
    });
});
```

### Integration (для Bot + platform adapter)

Файл: `tests/Bot/<scenario>.test.ts`

Паттерн — через прямой `run()` платформы:

```ts
import { Bot, BotController, T_ALISA } from '../../src';
import { AlisaAdapter, IAlisaWebhookResponse } from '../../src/plugins';

function getAlisaQuery(text: string, msgId: number = 1, state: object = {}): string {
    return JSON.stringify({
        meta: { locale: 'ru-Ru', timezone: 'UTC', client_id: 'test', interfaces: {} },
        session: {
            message_id: msgId,
            session_id: 'local',
            skill_id: 'local',
            user_id: 'test_user',
            new: msgId === 0,
        },
        request: {
            command: text.toLowerCase(),
            original_utterance: text,
            nlu: {},
            type: 'SimpleUtterance',
        },
        state: { session: state },
        version: '1.0',
    });
}

describe('Bot.handle', () => {
    let bot: Bot;

    beforeEach(() => {
        bot = new Bot();
        bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
        bot.use(new AlisaAdapter());
    });

    it('отвечает на команду привет', async () => {
        bot.addCommand('hello', ['привет'], (_, ctx) => {
            ctx.text = 'Салют!';
        });

        const res = (await bot.run(T_ALISA, getAlisaQuery('Привет'))) as IAlisaWebhookResponse;
        expect(res.response.text).toBe('Салют!');
    });
});
```

### Для CLI (`cli/`)

Файл: `tests/cli/<name>.test.ts`

CLI работает синхронно, можно тестировать через прямой вызов. Не запускай реальный процесс через child_process — используй import:

```ts
import { generateFromFlow, validateFlowSchema } from '../../cli/flowGenerator';
```

### Для платформ-специфичной логики

Файл: `tests/Platforms/<Platform>/adapter.test.ts`

Покрываем:

- `setQueryData` корректно маппит входящий query
- `isCorrectQuery` правильно валидирует
- `getContent` формирует правильный ответ

## Anti-patterns

### ❌ Не делай

```ts
// Тесты зависят друг от друга
it('step 1', () => {...});
it('step 2', () => { /* ожидается, что step 1 уже вызван */ });

// Реальный логер пишет в файловую систему
beforeEach(() => {
    bot = new Bot(); // создаст ./logs
});

// Тесты без cleanup таймеров
it('работаем с очередью', () => {
    const interval = setInterval(...);
    // ... тест
    // НЕТ clearInterval → process не выйдет
});
```

### ✅ Делай

```ts
// Каждый тест независим
beforeEach(() => {
    jest.clearAllMocks();
});

// Логер stub'ается
beforeEach(() => {
    bot = new Bot();
    bot.setLogger({ log: () => {}, error: () => {}, warn: () => {} });
});

// Долгоживущие таймеры — очищаем
afterEach(() => {
    destroyRateLimiter(); // если ранее cast использовал rateLimiter
});
```

## Когда тест падает

1. **"does not exit gracefully"** — есть таймеры/интервалы без `.unref()` или без cleanup.
2. **"Cannot find module"** — проверь, что импорт идёт из `../../src/`, не из `../../dist/`.
3. **"TypeError: Cannot read properties of undefined"** — ctx не инициализирован, вызови `bot.initBotController(...)` сначала.
4. **"ECONNREFUSED"** — ты делаешь реальный сетевой вызов. Замокай fetch.

## Reference

Хорошие примеры в репо:

- `tests/Bot/bot.test.ts` — integration через Alisa
- `tests/cli/flowGenerator.test.ts` — unit + integration для CLI
- `tests/Middleware/middleware.test.ts` — unit для middleware
- `tests/Request/*.test.ts` — моки fetch для request-классов
