// middleware/rateLimiter.ts
import { BotController } from '../controller';
import { AppContext, MiddlewareNext } from '../core';

interface QueueItem {
    resolve: () => void;
    reject: (err: Error) => void;
    task: () => Promise<void>;
}

interface PlatformState {
    queue: QueueItem[];
    processing: boolean;
    lastReset: number; // время последнего сброса счётчика (мс)
    count: number; // количество запросов за текущую секунду
    lastActivity: number; // время последней активности (для очистки)
}

async function processQueue(
    st: PlatformState,
    limit: number,
    appContext: AppContext,
): Promise<void> {
    try {
        while (st.queue.length > 0) {
            const now = Date.now();
            const timePassed = now - st.lastReset;

            // Если текущая секунда ещё не закончилась, ждём её окончания
            if (timePassed < 1000) {
                await new Promise((r) => setTimeout(r, 1000 - timePassed));
                // eslint-disable-next-line require-atomic-updates
                st.count = 0;
                // eslint-disable-next-line require-atomic-updates
                st.lastReset = Date.now();
            }

            // Определяем, сколько задач можно выполнить в этом цикле
            const canRun = Math.max(0, limit - st.count);
            if (canRun === 0) continue; // защита от лишних итераций

            // Берём из очереди ровно столько, сколько можем выполнить
            const batch = st.queue.splice(0, Math.min(canRun, st.queue.length));

            for (const item of batch) {
                st.count++;
                try {
                    await item.task();
                } catch (err) {
                    // Ошибка уже обработана в reject, но логируем на всякий случай
                    appContext.logError(
                        `rateLimited - произошла ошибки при обработке. Ошибка: ${(err as Error).message}`,
                        { err },
                    );
                }

                // Обновляем время активности после выполнения задачи
                // eslint-disable-next-line require-atomic-updates
                st.lastActivity = Date.now();

                // Равномерная задержка между запросами внутри пачки
                if (st.queue.length > 0) {
                    // -1 для подстраховки
                    await new Promise((r) => setTimeout(r, Math.ceil(1000 / limit) - 1));
                }
            }
        }
    } finally {
        // Гарантированно сбрасываем флаг обработки, даже если произошла ошибка
        st.processing = false;
        // Обновляем lastActivity после завершения обработки очереди
        st.lastActivity = Date.now();
    }
}

/**
 * Создаёт middleware для ограничения частоты входящих запросов (rate limiting) на уровне платформы.
 *
 * 🎯 **Для чего используется:**
 * Некоторые платформы (например, Max, Telegram, VK, Viber) имеют ограничение на количество
 * отправляемых ботом запросов в секунду (обычно 30). Данный middleware защищает от превышения
 * этого лимита, автоматически задерживая запросы, если они поступают слишком часто.
 *
 * ⚙️ **Как это работает:**
 * - Лимит берётся из свойства `limit` адаптера платформы (`platformAdapter.limit`).
 *   Если свойство не задано или равно 0, ограничение не применяется.
 * - Для каждой комбинации `{platform}:{userId}` ведётся отдельная очередь и счётчик запросов.
 * - Счётчик сбрасывается каждую секунду, что позволяет точно соблюдать лимит в скользящем окне.
 * - Если лимит исчерпан, запрос помещается в очередь и будет выполнен, когда появится свободное «окно».
 * - Очередь имеет максимальный размер (`maxQueueSize`); при переполнении выбрасывается ошибка.
 * - Запросы в очереди выполняются с равномерной задержкой (⌈1000/limit⌉ мс), чтобы не превышать лимит.
 * - Неактивные записи (без запросов дольше `inactivityTimeout`) автоматически удаляются из памяти.
 *
 * 🧠 **Важные особенности:**
 * - Middleware применяется **только к входящим запросам** (webhook). Для исходящих уведомлений
 *   ограничение нужно реализовывать непосредственно в адаптерах платформ.
 * - Функцию необходимо **вызвать** при подключении: `bot.use(rateLimiter())`.
 * - Все внутренние таймеры используют `unref()`, поэтому не блокируют завершение процесса.
 *
 * @param maxQueueSize - Максимальное количество ожидающих запросов в очереди для одного ключа (по умолчанию 100).
 *                       При превышении очередь перестаёт принимать новые запросы и выбрасывается исключение.
 * @param inactivityTimeout - Время в миллисекундах, после которого запись (очередь + счётчик) удаляется,
 *                            если не было активности. По умолчанию 60000 (1 минута).
 * @returns Middleware-функция для использования в `bot.use()`.
 *
 * @example
 * ```ts
 * import { rateLimiter } from 'umbot/middleware';
 *
 * // Подключаем middleware с параметрами по умолчанию
 * bot.use(rateLimiter());
 *
 * // Или с кастомными настройками
 * bot.use(rateLimiter(200, 120000));
 * ```
 *
 * @remarks
 * Чтобы лимит заработал для вашей платформы, добавьте в соответствующий адаптер публичное поле `limit`:
 * ```ts
 * export class TelegramAdapter extends BasePlatform {
 *   public limit = 30;
 *   // ...
 * }
 * ```
 */
export function rateLimiter(
    maxQueueSize = 100,
    inactivityTimeout = 60000,
): (ctx: BotController, next: MiddlewareNext) => Promise<void> {
    const stateMap = new Map<string, PlatformState>();
    let cleanupInterval: ReturnType<typeof setInterval> | null = null;
    const startCleanup = (): void => {
        if (!cleanupInterval) {
            cleanupInterval = setInterval(
                () => {
                    const now = Date.now();
                    for (const [key, st] of stateMap.entries()) {
                        // Удаляем запись, если она неактивна дольше порога и очередь пуста
                        if (now - st.lastActivity > inactivityTimeout && st.queue.length === 0) {
                            stateMap.delete(key);
                        }
                    }
                },
                Math.min(inactivityTimeout / 2, 30000),
            ).unref();
        }
    };
    startCleanup();

    return async (ctx: BotController, next: MiddlewareNext) => {
        const platform = ctx.appType;
        const userId = ctx.userId || 'um_unknown';

        if (!platform) {
            return next();
        }

        // Получаем лимит из адаптера платформы
        const platformAdapter = ctx.appContext.platforms[platform];
        const limit = platformAdapter?.limit;
        if (!limit) {
            return next(); // лимит не задан – пропускаем
        }

        const key = `${platform}:${userId}`;

        // Получаем или создаём состояние для этого ключа
        let st = stateMap.get(key);
        if (!st) {
            st = {
                queue: [],
                processing: false,
                lastReset: Date.now(),
                count: 0,
                lastActivity: Date.now(),
            };
            stateMap.set(key, st);
        }
        st.lastActivity = Date.now();

        const now = Date.now();
        // Сброс счётчика каждую секунду
        if (now - st.lastReset >= 1000) {
            st.count = 0;
            st.lastReset = now;
        }

        // Если влезаем в лимит – выполняем сразу
        if (st.count < limit) {
            st.count++;
            return next();
        }

        // Превышен лимит – ставим в очередь, если есть место
        if (st.queue.length >= maxQueueSize) {
            throw new Error(
                `rateLimit - Превышено ограничение на размер очереди. Убедитесь что значение указанно корректно, текущее значение - ${maxQueueSize}.`,
            );
        }

        // Возвращаем промис, который будет разрешён после выполнения задачи
        return new Promise<void>((resolve, reject) => {
            st.queue.push({
                resolve,
                reject,
                task: async () => {
                    try {
                        await next();
                        resolve();
                    } catch (err) {
                        reject(err instanceof Error ? err : new Error(String(err)));
                    }
                },
            });

            // Запускаем обработчик очереди, если он ещё не запущен
            if (!st.processing) {
                st.processing = true;
                // Передаём appContext для логирования ошибок и сам state
                processQueue(st, limit, ctx.appContext);
            }
        });
    };
}
