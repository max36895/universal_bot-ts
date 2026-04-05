# Middleware

`umbot` поддерживает **middleware в стиле `telegraf` и `vk-io`** — функции, которые вызываются **до запуска бизнес-логики** (`BotController.action`).

## 📦 Установка

```ts
import { T_ALISA } from 'umbot/plugins';

// Глобальный middleware (для всех платформ)
bot.use(async (ctx, next) => {
    console.log('Запрос:', ctx.appType);
    await next(); // обязательно вызвать next() для продолжения
});

// middleware для конкретной платформы
bot.use(T_ALISA, async (ctx, next) => {
    if (!ctx.appContext.requestObject?.session?.user_id) {
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
