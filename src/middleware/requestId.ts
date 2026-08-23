// middleware/requestId.ts
import { BotController } from '../controller';
import { MiddlewareNext } from '../core';
import { randomUUID } from 'crypto';

declare module '../controller/BotController' {
    interface IPlatformOptions {
        /**
         * Уникальный идентификатор входящего запроса.
         * Заполняется middleware `requestId()`.
         */
        requestId?: string;
    }
}

/**
 * Middleware, проставляющее уникальный `requestId` в `platformOptions.requestId`.
 *
 * Полезно для сквозного трейсинга запросов — логгеры, Sentry и другие инструменты
 * могут связать все логи одного входящего запроса.
 *
 * Также сохраняет requestId в `appContext.lastRequestIdAt` — последний выданный ID
 * с timestamp. Это даёт возможность логировщику во время произвольных вызовов
 * (например, из lifecycle-кода вне обработки запроса) упомянуть request_id.
 *
 * @example
 * ```ts
 * import { requestId } from 'umbot/middleware';
 *
 * bot.use(requestId());
 * // дальше в обработчике или других middleware есть ctx.platformOptions.requestId
 * ```
 *
 * @returns Middleware для `bot.use(...)`.
 */
export function requestId(): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    return async (ctx: BotController, next: MiddlewareNext): Promise<void> => {
        let id: string;
        try {
            id = randomUUID();
        } catch {
            // Запасной вариант на очень старые рантаймах — падаем на простой timestamp.
            id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        ctx.platformOptions.requestId = id;
        // Сохраняем в AppContext для логов вне текущего контекста (если кто-то логирует
        // без доступа к ctx). Не перетираем race — нам безразлично, чей именно id
        // крайний.
        try {
            (ctx.appContext as unknown as Record<string, unknown>).__lastRequestId = id;
        } catch {
            // ignore — если контекст заморожен или readonly, просто пропускаем
        }
        // Обязательно возвращаем промис next(): диспетчер Bot.#runMiddlewares делает
        // `await mw(...)`. Если вернуть undefined, цепочка продолжится «в отрыве» и
        // запрос будет помечан заблокированным до завершения реальных обработчиков.
        await next();
    };
}
