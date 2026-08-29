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
 * могут связать все логи одного входящего запроса через `ctx.platformOptions.requestId`.
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
            // Запасной вариант на очень старых рантаймах — падаем на простой timestamp.
            id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        }
        ctx.platformOptions.requestId = id;
        // Обязательно возвращаем промис next(): диспетчер Bot.#runMiddlewares делает
        // `await mw(...)`. Если вернуть undefined, цепочка продолжится «в отрыве» и
        // запрос будет помечен заблокированным до завершения реальных обработчиков.
        await next();
    };
}
