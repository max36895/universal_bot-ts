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
    let object: ITelegramKeyboard = {};
    const inlines: ITelegramInlineKeyboard[] = [];
    const reply: ITelegramReplyButton[] = [];

    getCorrectButtons(buttons, 40).forEach((button) => {
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
        if (button.url) {
            // url и callback_data взаимоисключающие в Telegram API
            const inline: ITelegramInlineKeyboard = {
                text: button.title,
                url: button.url,
            };
            inlines.push(inline);
        } else if (button.payload) {
            const inline: ITelegramInlineKeyboard = {
                text: button.title,
                callback_data: callbackData,
            };
            inlines.push(inline);
        } else {
            const replyBtn: ITelegramReplyButton = { text: button.title || '' };
            if (button.options?.request_contact) replyBtn.request_contact = true;
            if (button.options?.request_location) replyBtn.request_location = true;
            reply.push(replyBtn);
        }
    });
    const rCount = reply.length;
    const rInline = inlines.length;
    if (rCount || rInline) {
        if (rInline) {
            object.inline_keyboard = inlines.map((btn) => [btn]);
        } else if (rCount) {
            object.keyboard = reply.map((btn) => [btn]);
            object.resize_keyboard = true;
        }
    } else {
        // Удаляем клавиатуру из-за ненадобности
        object = { remove_keyboard: true };
    }
    return object;
}
