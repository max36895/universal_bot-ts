import { IButtonType } from '../../../index';

import {
    ITelegramKeyboard,
    ITelegramInlineKeyboard,
    ITelegramReplyButton,
} from './interfaces/ITelegramPlatform';
import { getCorrectButtons } from '../Base/utils';

/**
 * Получение кнопок в формате Telegram
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing(buttons: IButtonType[]): ITelegramKeyboard | null {
    let object: ITelegramKeyboard = {};
    const inlines: ITelegramInlineKeyboard[] = [];
    const reply: ITelegramReplyButton[] = [];

    getCorrectButtons(buttons, 40).forEach((button) => {
        if (button.url) {
            const inline: ITelegramInlineKeyboard = {
                text: button.title,
                url: button.url,
            };
            if (button.payload) {
                inline.callback_data = button.payload;
            }
            inlines.push(inline);
        } else if (button.payload) {
            inlines.push({
                text: button.title,
                callback_data: button.payload,
            });
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
            object.inline_keyboard = inlines;
        }
        if (rCount) {
            object.keyboard = reply;
        }
    } else {
        // Удаляем клавиатуру из-за ненадобности
        object = { remove_keyboard: true };
    }
    return object;
}
