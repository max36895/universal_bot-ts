---
name: umbot-add-middleware
description: 'Добавить стандартное middleware в umbot (src/middleware/)'
---

# Add Middleware: скилл для добавления новой middleware

## Назначение

Добавить новую middleware в `src/middleware/` — например, кэширование, retry, feature flags, сборка статистики, и т.д.

Middleware — это функция вида `(ctx, next) => Promise<void>` или `(ctx, next) => void`, подключённая через `bot.use(...)`. Она выполняется до `BotController.run()` (то есть до поиска команды и шаги).

## Триггер

- "добавь middleware X"
- "нужна обработка перед командами"
- "вынести логику авторизации"

## Workflow

### Шаг 0: Спроси про UX

Спроси пользователя:

1. Что делает middleware в одном предложении?
2. Синхронная или асинхронная логика?
3. Должна ли middleware быть **опциональной** (конфигурация параметрами)?
4. Должна ли она возвращать **ранний ответ** пользователю (например, "недоступно")?

### Шаг 1: Спланируй API

Примеры хороших сигнатур из существующих middleware:

```ts
rateLimiter(limit?: number, maxQueueSize?: number)
authGuard(check, options?: { deniedText?: string })
maintenance(check, options?: { message?: string })
requestId()
ipFilter(options: { whitelist?: string[]; blacklist?: string[] })
```

Заметь: **функция-фабрика** возвращает middleware. Не экспортируй сам middleware напрямую — только фабрику.

### Шаг 2: Создай файл

`src/middleware/<name>.ts`:

````ts
// middleware/<name>.ts
import { BotController } from '../controller';
import { MiddlewareNext } from '../core';

/**
 * Опции middleware.
 */
export interface I<Name>Options {
    // ...
}

/**
 * Middleware для <что делает>.
 *
 * @example
 * ```ts
 * import { <name> } from 'umbot/middleware';
 * bot.use(<name>(options));
 * ```
 */
export function <name>(
    options?: I<Name>Options,
): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    // читаем опции с дефолтами
    return async (ctx: BotController, next: MiddlewareNext): Promise<void> => {
        // — твоя логика —

        // Обязательно:
        // 1. если всё ок → `await next()`
        // 2. если блокируем → ctx.text = "..."; return;  (НЕ вызываем next)
        // 3. ошибки — try/catch, ошибки логируй через ctx.appContext.logError, реши пропускать или нет
    };
}
````

### Шаг 3: Не мутируй ctx напрямую если не должен

- ✅ `ctx.userData.foo = 'bar'` — это нормально, это предположение UX
- ✅ `ctx.platformOptions.customX = ...` — для служебного состояния
- ⚠️ `ctx.text = '...'` — только если хочешь ответить и прервать
- ❌ `ctx.userData = {...}` — не перезаписывай целиком (используй присваивание по ключам)

### Шаг 3.1: Помни контракт исключений

Ядро (`Bot.#runMiddlewares`) ловит **любое** исключение middleware, логирует его и
трактует как «обработка прервана»: платформа получает HTTP 200 с текущим `ctx.text`
(на `5xx` Telegram/VK включают ретраи и отключают вебхук — поэтому 200 это осознанно).

Если middleware должна **осознанно отклонить** запрос (перегрузка, лимиты):

1. Экспортируй типизированный класс ошибки (образец: `RateLimitQueueOverflowError` в
   `src/middleware/rateLimiter.ts`) — по нему вызывающий код отличит отказ от бага.
2. Выстави флаг в `ctx.platformOptions` до броска (образец: `rateLimitOverflow`),
   объявив его через `declare module '../controller/BotController'` augmentation.
3. Задокументируй в JSDoc, что исключение перехватывается ядром и как его детектить.

### Шаг 4: Экспортируй

Добавь в `src/middleware.ts`:

```ts
export { <name> } from './middleware/<name>';
export type { I<Name>Options } from './middleware/<name>';
```

### Шаг 5: Тесты

`tests/Middleware/<name>.test.ts`:

Минимум:

1. Пропуск при успехе
2. Блокировка при отказе (если middleware это предполагает)
3. При исключении — продолжение или блокировка (по дизайну)
4. Иммутабельность ctx: не должна менять чужие поля
5. Sync + async поддержка (если оба пути есть)

```ts
import { <name> } from '../../src/middleware';
import { BotController } from '../../src/controller';
import { AppContext } from '../../src/core';

describe('<name> middleware', () => {
    it('пропускает, когда ...', async () => {
        const ctx = new BotController(new AppContext());
        let called = false;
        await <name>()(ctx, async () => { called = true; });
        expect(called).toBe(true);
    });
    // ...
});
```

### Шаг 6: Документация

Добавь раздел в `src/docs/middleware.md`:

- Что делает
- Как использовать
- Пример с пояснением
- Граничные случаи
- Best practice

### Шаг 7: CHANGELOG

Добавь в `[Unreleased]` или целевую версию:

```markdown
- **Middleware**: `myMiddleware(options)` — <короткое описание>.
```

## Anti-patterns

❌ Не логируй токены/пароли в middleware. Всё, что уходит в `logError`/`logWarn`/`logMetric`, проходит маскирование секретов — не обходи его ручной сериализацией в логгер.
❌ Не делай `await next()` дважды (это сломает цепочку).
❌ Не используй глобальные переменные без возможности сброса (`destroyXxx()`).
❌ Не мутируй `ctx.requestObject` — это reference от платформы.
❌ Не используй `setInterval`/`setTimeout` без `.unref()` — процесс не выйдет.
❌ Не храни состояние в неограниченных Map — задай лимит + вытеснение (образец: `MAX_STATE_MAP_SIZE` и `evictEntry` в rateLimiter) и помечай вытесненные записи `dead`, чтобы работающие очереди не исполняли их задачи.
❌ Не рассчитывай, что batch-обработка очереди обнуляет счётчик лимита: параллельные «свежие» запросы занимают тот же счётчик — проверяй лимит перед каждым элементом пачки (см. `processQueue` в rateLimiter).

## Success criteria

1. ✅ Build clean (`npm run build`)
2. ✅ Tests green (`npm run test`)
3. ✅ Lint clean (`npm run lint`)
4. ✅ Prettier applied (`npm run prettier`)
5. ✅ CHANGELOG обновлён
6. ✅ Документация в `src/docs/middleware.md`
