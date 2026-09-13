// middleware/maintenance.ts
import { BotController } from '../controller';
import { MiddlewareNext } from '../core';

/**
 * Тип функции, возвращающей `true`, если сервис находится на обслуживании.
 * Может быть синхронной или асинхронной.
 */
export type TMaintenanceCheck = () => boolean | Promise<boolean>;

/**
 * Опции middleware maintenance.
 */
export interface IMaintenanceOptions {
    /**
     * Текст, который получит пользователь, если сервис на обслуживании.
     * @defaultValue 'Сервис временно недоступен. Попробуйте позже.'
     */
    message?: string;
}

/**
 * Middleware, возвращающее "на техническом обслуживании", пока `check()` возвращает true.
 *
 * Полезно, когда нужно остановить обработку запросов: миграция БД, переключение версии,
 * отладка внешней зависимости.
 *
 * @example
 * ```ts
 * import { maintenance } from 'umbot/middleware';
 *
 * let isDown = false;
 * // ... где-то меняем isDown, например по расписанию или через admin-команду
 *
 * bot.use(maintenance(() => isDown, { message: 'Бот обновляется, вернёмся через 5 минут' }));
 * ```
 *
 * @param check Функция, возвращающая `true` если сервис недоступен.
 * @param options Настройки ответа пользователю.
 * @returns Middleware для `bot.use(...)`.
 */
export function maintenance(
    check: TMaintenanceCheck,
    options: IMaintenanceOptions = {},
): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    const message = options.message ?? 'Сервис временно недоступен. Попробуйте позже.';
    return async (ctx: BotController, next: MiddlewareNext): Promise<void> => {
        let isDown = false;
        try {
            isDown = !!(await check());
        } catch (e) {
            // Ошибка в check() — это не повод отключать сервис. Логируем и пропускаем запрос дальше.
            ctx.appContext.logError(
                `maintenance: ошибка в check-функции: ${e instanceof Error ? e.message : String(e)}`,
            );
        }
        if (isDown) {
            ctx.text = message;
            return;
        }
        await next();
    };
}
