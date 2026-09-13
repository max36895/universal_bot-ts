/**
 * API-фасад Viber для `controller.api`.
 *
 * Даёт бизнес-логике единый контракт `IControllerApi`, но сам Viber его
 * ограничивает (см. makeViberApi): Bot API Viber отправляет медиа только по
 * публичному URL с обязательным `size`, который фасад знать не может.
 */

import { BotController } from '../../../controller';
import type { IControllerApi, TApiMethod } from '../../../controller';

/**
 * Создаёт API-фасад Viber для контроллера.
 *
 * Viber Bot API отправляет медиа только по публичному URL с обязательным
 * `size` (фактический размер файла в байтах), который фасад знать не может —
 * поэтому методы медиа возвращают warn/null; для медиа используется
 * `controller.card` (адаптер сам строит rich_media по URL картинки).
 *
 * Публично реэкспортируется из umbot/plugins.
 */
export function makeViberApi(controller: BotController): IControllerApi {
    const warn = (method: string, reason: string): null => {
        controller.appContext?.logWarn(
            `controller.api.${method}(): ${reason} Используйте controller.card / ViberRequest напрямую.`,
        );
        return null;
    };
    return {
        async sendPhoto(): Promise<Record<string, unknown> | null> {
            return warn('sendPhoto', 'Viber принимает медиа только по URL с обязательным size.');
        },
        async sendDocument(): Promise<Record<string, unknown> | null> {
            return warn('sendDocument', 'Viber принимает файлы только по URL с обязательным size.');
        },
        async sendAudio(): Promise<Record<string, unknown> | null> {
            return warn('sendAudio', 'в Bot API Viber нет аудиосообщений (только file/video).');
        },
        async sendVideo(): Promise<Record<string, unknown> | null> {
            return warn('sendVideo', 'Viber принимает видео только по URL с обязательным size.');
        },
        async answerCallback(): Promise<Record<string, unknown> | null> {
            return warn('answerCallback', 'в Viber нет callback-кнопок.');
        },
        can(_method: TApiMethod): boolean {
            // Viber не поддерживает ни один метод фасада без URL+size.
            return false;
        },
    };
}
