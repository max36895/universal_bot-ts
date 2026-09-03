import { IButtonType, AppContext } from '../../../index';

import {
    ITelegramKeyboard,
    ITelegramInlineKeyboard,
    ITelegramReplyButton,
} from './interfaces/ITelegramPlatform';
import { getCorrectButtons, serializePlatformPayload } from '../Base/utils';
import { TG_CALLBACK_DATA_MAX_LENGTH } from './constants';

/**
 * Получение кнопок в формате Telegram
 * @param buttons Кнопки, которые необходимо отобразить
 * @param appContext Контекст приложения (опционально, для логирования ошибок валидации)
 */
export function buttonProcessing(
    buttons: IButtonType[],
    appContext?: AppContext,
): ITelegramKeyboard | null {
    const object: ITelegramKeyboard = {};
    const inlines: ITelegramInlineKeyboard[] = [];
    const reply: ITelegramReplyButton[] = [];

    getCorrectButtons(buttons, 40).forEach((button) => {
        if (!button.title?.trim()) {
            appContext?.logWarn('[Telegram] Кнопка с пустым text пропущена.');
            return;
        }
        // URL-кнопка не использует callback_data, поэтому лимит 64 байта к ней
        // неприменим: проверка payload до ветки url отбрасывала валидную url-кнопку,
        // у которой просто задан крупный payload для других платформ.
        if (button.url) {
            // url и callback_data взаимоисключающие в Telegram API
            inlines.push({
                text: button.title,
                url: button.url,
            });
            return;
        }
        const callbackData = button.payload
            ? serializePlatformPayload(button.payload, 'Telegram', appContext)
            : undefined;
        if (callbackData === null) {
            return;
        }
        // Проверяем лимит callback_data (Telegram Bot API: 1-64 байта)
        if (typeof callbackData === 'string') {
            const byteLength = Buffer.byteLength(callbackData, 'utf8');
            if (byteLength > TG_CALLBACK_DATA_MAX_LENGTH) {
                appContext?.logWarn(
                    `[Telegram] callback_data превышает лимит ${TG_CALLBACK_DATA_MAX_LENGTH} байт (${byteLength} байт). Кнопка будет пропущена без изменения данных.`,
                );
                return;
            }
        }
        if (button.payload && typeof callbackData === 'string') {
            const inline: ITelegramInlineKeyboard = {
                text: button.title,
                callback_data: callbackData,
            };
            inlines.push(inline);
        } else {
            const replyBtn: ITelegramReplyButton = { text: button.title };
            if (button.options?.request_contact) replyBtn.request_contact = true;
            if (button.options?.request_location) replyBtn.request_location = true;
            reply.push(replyBtn);
        }
    });
    const rCount = reply.length;
    const rInline = inlines.length;
    if (rCount || rInline) {
        if (rInline) {
            if (rCount) {
                // Telegram не умеет совмещать inline_keyboard и обычную keyboard в одном
                // сообщении: приходится выбирать одну. Раньше reply-кнопки просто исчезали,
                // и разработчик видел на Telegram не тот набор кнопок, что на VK/MAX/Viber.
                appContext?.logWarn(
                    `[Telegram] В ответе одновременно заданы inline-кнопки (${rInline}) и обычные (${rCount}). ` +
                        'Telegram принимает только один тип клавиатуры в сообщении — отправлены будут inline-кнопки, ' +
                        'обычные будут пропущены. Задайте payload/url всем кнопкам либо ни одной.',
                );
            }
            object.inline_keyboard = inlines.map((btn) => [btn]);
        } else if (rCount) {
            object.keyboard = reply.map((btn) => [btn]);
            object.resize_keyboard = true;
        }
    } else {
        // Невалидные кнопки не должны снимать уже показанную пользователю клавиатуру.
        return null;
    }
    return object;
}
