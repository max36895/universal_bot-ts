/**
 * API-фасад Telegram для `controller.api`.
 *
 * Даёт бизнес-логике доступ к «горячим» возможностям платформы (отправить
 * медиа, ответить на callback-кнопку) без ручного конструирования
 * `TelegramRequest`. Фасад создаётся лениво при первом обращении к
 * `ctx.api` — на запросах без API-вызовов объект не аллоцируется.
 */

import { BotController } from '../../../controller';
import type { IControllerApi, TApiMethod } from '../../../controller';
import { TelegramRequest } from '../API/TelegramRequest';
import { getPlatformRequestData } from '../Base/utils';

/**
 * Технические данные Telegram-адаптера, которые использует фасад.
 */
type ITgApiData = Record<string, unknown> & {
    callbackQueryId?: string;
    chatId?: number | string;
    inlineQueryId?: string;
};

const TG_SUPPORTED: readonly TApiMethod[] = [
    'sendPhoto',
    'sendDocument',
    'sendAudio',
    'sendVideo',
    'answerCallback',
];

/**
 * Создаёт API-фасад Telegram для контроллера.
 *
 * Публично реэкспортируется из umbot/plugins.
 */
export function makeTelegramApi(controller: BotController): IControllerApi {
    const request = (): TelegramRequest => new TelegramRequest(controller.appContext);
    const chatId = (): string | number | null =>
        getPlatformRequestData<ITgApiData>(controller, 'telegram').chatId ??
        controller.userId ??
        null;
    // Без chat_id Telegram отклонит запрос «chat_id is empty» — сразу честный
    // null с warn вместо отправки заведомо битого запроса.
    const requireChatId = (): string | number | null => {
        const id = chatId();
        if (id === null) {
            controller.appContext?.logWarn(
                'controller.api (telegram): у текущего запроса нет chat_id — отправка невозможна. Метод вызван вне контекста диалога (рассылка/инициализация)?',
            );
        }
        return id;
    };
    // Ответы Telegram API (ITelegramResult) не имеют индексной сигнатуры —
    // приводим к Record для универсального типа фасада.
    const toRecord = (result: object | null): Record<string, unknown> | null =>
        result === null ? null : (result as unknown as Record<string, unknown>);
    // exactOptionalPropertyTypes: caption кладём в params только при наличии.
    const withCaption = (caption: string | undefined): { caption: string } | null =>
        caption ? { caption } : null;
    return {
        async sendPhoto(
            image: string,
            params?: { caption?: string },
        ): Promise<Record<string, unknown> | null> {
            const id = requireChatId();
            return id === null
                ? null
                : toRecord(await request().sendPhoto(id as string, image, params?.caption ?? null));
        },
        async sendDocument(
            file: string,
            params?: { caption?: string },
        ): Promise<Record<string, unknown> | null> {
            const id = requireChatId();
            return id === null
                ? null
                : toRecord(
                      await request().sendDocument(
                          id as string,
                          file,
                          withCaption(params?.caption),
                      ),
                  );
        },
        async sendAudio(
            file: string,
            params?: { caption?: string },
        ): Promise<Record<string, unknown> | null> {
            const id = requireChatId();
            return id === null
                ? null
                : toRecord(
                      await request().sendAudio(id as string, file, withCaption(params?.caption)),
                  );
        },
        async sendVideo(
            file: string,
            params?: { caption?: string },
        ): Promise<Record<string, unknown> | null> {
            const id = requireChatId();
            return id === null
                ? null
                : toRecord(
                      await request().sendVideo(id as string, file, withCaption(params?.caption)),
                  );
        },
        async answerCallback(
            text: string,
            showAlert?: boolean,
        ): Promise<Record<string, unknown> | null> {
            const callbackQueryId =
                getPlatformRequestData<ITgApiData>(controller, 'telegram').callbackQueryId ??
                controller.platformOptions.callbackQueryId ??
                null;
            if (!callbackQueryId) {
                controller.appContext?.logWarn(
                    'controller.api.answerCallback(): у текущего запроса Telegram нет callback_query_id — кнопка не была нажата.',
                );
                return null;
            }
            return toRecord(
                await request().answerCallbackQuery(
                    callbackQueryId,
                    text,
                    showAlert === true,
                    undefined,
                    0,
                ),
            );
        },
        can(method: TApiMethod): boolean {
            return (TG_SUPPORTED as readonly string[]).includes(method);
        },
    };
}
