// middleware/authGuard.ts
import { BotController } from '../controller';
import { MiddlewareNext } from '../core';

/**
 * Тип функции-проверки доступа.
 * Должна вернуть `true`, если запрос пропускается дальше, иначе `false`.
 */
export type TAuthCheck = (ctx: BotController) => boolean | Promise<boolean>;

/**
 * Опции middleware authGuard.
 */
export interface IAuthGuardOptions {
    /**
     * Текст ответа пользователю, который не прошёл авторизацию.
     * @defaultValue 'Доступ запрещён.'
     */
    deniedText?: string;
}

/**
 * Middleware для проверки прав доступа перед выполнением остальных обработчиков.
 *
 * Возвращает `deniedText`, если `check` вернул false. В противном случае вызывает `next()`.
 * Ничего не знает про конкретные платформы — `check` получает обычный `BotController` и сам решает,
 * авторизован пользователь или нет (по `userId`, `userData.role`, списку ID и т.п.).
 *
 * @param check Асинхронная или синхронная функция, возвращающая `true`, если запрос авторизован.
 * @param options Настройки ответа при отказе.
 * @returns Middleware для `bot.use(...)`.
 *
 * @example
 * ```ts
 * const ADMIN_IDS = ['12345', '67890'];
 * bot.use(authGuard(
 *   (ctx) => ADMIN_IDS.includes(String(ctx.userId)),
 *   { deniedText: 'Эта команда доступна только администраторам' }
 * ));
 * ```
 */
export function authGuard(
    check: TAuthCheck,
    options: IAuthGuardOptions = {},
): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    const deniedText = options.deniedText ?? 'Доступ запрещён.';
    return async (ctx: BotController, next: MiddlewareNext): Promise<void> => {
        // Считаем и защищаем ctx через снимок: после await check(ctx) ctx.text мог
        // измениться — берём актуальную ссылку в момент записи.
        let allowed: boolean;
        try {
            allowed = !!(await check(ctx));
        } catch (e) {
            // Любая ошибка в пользовательской проверке — это отказ, а не падение пайплайна.
            ctx.appContext.logError('authGuard: ошибка в check-функции', {
                error: e instanceof Error ? e.message : String(e),
            });
            allowed = false;
        }
        if (!allowed) {
            // eslint-disable-next-line require-atomic-updates -- запись в ctx.text идемпотентна
            ctx.text = deniedText;
            return;
        }
        await next();
    };
}
