# Middleware

`umbot` поддерживает **middleware в стиле `telegraf` и `vk-io`** — функции, которые вызываются **до запуска бизнес-логики** (`BotController.action`).

## Использование

```ts
import { T_ALISA } from 'umbot/plugins';

// Глобальный middleware (для всех платформ)
bot.use(async (ctx, next) => {
    console.log('Запрос:', ctx.appType);
    await next(); // обязательно вызвать next() для продолжения
});

// middleware для конкретной платформы
bot.use(T_ALISA, async (ctx, next) => {
    if (!ctx.requestObject?.session?.user_id) {
        ctx.text = 'Некорректный запрос';
        ctx.isEnd = true;
        // next() не вызывается → action() не запустится
        return;
    }
    await next();
});
```

## ⚠️ Важно

- Middleware получает полный BotController (с text, isEnd, userData и т.д.).
- Если вы не вызовете next(), то action() не будет вызван — это нормально.
- Порядок выполнения: сначала глобальные, потом платформенно-специфичные middleware.
- Избегайте глубоких цепочек middleware (>5)

## Кастомная middleware

### Пример: логирование всех запросов

```ts
bot.use(async (ctx, next) => {
    const start = Date.now();
    console.log(`[${ctx.appType}] Запрос от ${ctx.userId}: ${ctx.userCommand}`);
    await next();
    console.log(`[${ctx.appType}] Ответ: "${ctx.text}" (${Date.now() - start}ms)`);
});
```

### Пример: проверка авторизации

```ts
bot.use(async (ctx, next) => {
    // Пропускаем приветствие и помощь
    if (ctx.messageId === 0 || ctx.userCommand === 'помощь') {
        await next();
        return;
    }

    // Проверяем, авторизован ли пользователь
    if (!ctx.userData?.isAuthorized) {
        ctx.text = 'Для использования бота необходимо авторизоваться.';
        ctx.isEnd = true;
        return; // next() не вызываем — action() не запустится
    }

    await next();
});
```

### Пример: middleware для конкретной платформы

```ts
import { T_TELEGRAM } from 'umbot/plugins';

// Только для Telegram
bot.use(T_TELEGRAM, async (ctx, next) => {
    // Telegram-specific логика
    if (ctx.payload?.command === 'cancel') {
        ctx.text = 'Действие отменено.';
        ctx.isEnd = true;
        return;
    }
    await next();
});
```

---

## Встроенная middleware: rateLimiter

Фреймворк поставляется с встроенной middleware для ограничения частоты запросов (`rateLimiter`). По умолчанию лимит — 30 req/sec на платформу (совпадает с лимитами Telegram, VK, Max). Если у адаптера задан свой лимит (свойство `limit`), rateLimiter использует его.

```ts
import { rateLimiter } from 'umbot/middleware';

bot.use(rateLimiter()); // дефолт: queue=100, idle=60s
// или с кастомными параметрами
bot.use(rateLimiter(200, 120_000)); // queue=200, idle 2 мин
```

**Что делает:**

- Читает `appContext.platforms[platform].limit` (для TG/VK/Viber/Max = 30 по умолчанию).
- Поддерживает sliding-1s-window per `{platform, userId}`.
- При превышении — ставит в очередь (до `maxQueueSize`).
- Переполнение очереди → бросает исключение.
- Все таймеры `.unref()` — не блокируют выход процесса.

> **Важно:** rateLimiter ограничивает **входящие** запросы (от платформы к вам), а не **исходящие** API-вызовы (от вас к API платформы).
