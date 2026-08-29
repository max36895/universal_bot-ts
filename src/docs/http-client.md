# Кастомизация HTTP-слоя

Вы можете заменить встроенный `fetch` на любой совместимый HTTP-клиент через
`AppContext.httpClient`. Это позволяет добавлять retry-логику, тайм-ауты, tracing, моки в тестах и т.д.

## Зачем это нужно?

- **Тайм-ауты** — ограничение времени запросов
- **Retry-логика** — повторные попытки при ошибках
- **Tracing** — трассировка запросов
- **Моки** — подмена в тестах

## Пример: тайм-аут

```ts
import { Bot } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const bot = new Bot();
bot.use(fullPlatforms);
const ctx = bot.getAppContext();

ctx.httpClient = async (input, init) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    try {
        const res = await fetch(input, { ...init, signal: controller.signal });
        clearTimeout(id);
        return res;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

bot.start('localhost', 3000);
```

## Пример: retry-логика

```ts
import { Bot } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const bot = new Bot();
bot.use(fullPlatforms);
const ctx = bot.getAppContext();

ctx.httpClient = async (input, init) => {
    const maxRetries = 3;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(input, init);
            if (res.ok) return res;
            lastError = new Error(`HTTP ${res.status}`);
        } catch (e) {
            lastError = e as Error;
        }
        // Экспоненциальная задержка перед повтором
        if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1000 * 2 ** (attempt - 1)));
        }
    }
    throw lastError;
};

bot.start('localhost', 3000);
```

## Пример: tracing (логирование запросов)

```ts
import { Bot } from 'umbot';
import { fullPlatforms } from 'umbot/plugins';

const bot = new Bot();
bot.use(fullPlatforms);
const ctx = bot.getAppContext();

ctx.httpClient = async (input, init) => {
    const start = performance.now();
    // input может быть string | URL | Request — сужаем тип
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    console.log(`[HTTP] → ${init?.method ?? 'GET'} ${url}`);

    try {
        const res = await fetch(input, init);
        const ms = (performance.now() - start).toFixed(1);
        console.log(`[HTTP] ← ${res.status} ${url} (${ms}ms)`);
        return res;
    } catch (e) {
        const ms = (performance.now() - start).toFixed(1);
        console.log(`[HTTP] ✗ ${url} ERROR (${ms}ms): ${e}`);
        throw e;
    }
};

bot.start('localhost', 3000);
```

## Пример: мок в тестах

```ts
import { BotTest } from 'umbot/test';
import { fullPlatforms } from 'umbot/plugins';

const bot = new BotTest();
bot.use(fullPlatforms);
const ctx = bot.getAppContext();

// Подменяем fetch на мок
ctx.httpClient = async (input, init) => {
    // input может быть string | URL | Request — сужаем тип
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.includes('api.weather.com')) {
        return new Response(JSON.stringify({ temp: 25 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    return new Response('Not Found', { status: 404 });
};

// Запускаем через simulate() — в отличие от интерактивного bot.test()
// он не блокируется в ожидании ввода и не ходит в реальные API платформ
await bot.simulate('какая сегодня погода?');
```

## Какой тип использовать?

`httpClient` должен соответствовать сигнатуре:

```ts
type THttpClient = (url: URL | RequestInfo, init?: RequestInit) => Promise<Response>;
```

Это совместимо с глобальным `fetch` в Node.js 20.19+, а также с библиотеками типа `node-fetch`, `undici`, `got` (через обёртку).
