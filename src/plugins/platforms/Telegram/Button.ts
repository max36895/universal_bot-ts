import { Button } from '../../../index';

import { ITelegramKeyboard, ITelegramInlineKeyboard } from './interfaces/ITelegramPlatform';

/**
 * Получение кнопок в формате Telegram
 * @param buttons Кнопки, которые необходимо отобразить
 */
export function buttonProcessing(buttons: Button[]): ITelegramKeyboard | null {
    let object: ITelegramKeyboard = {};
    const inlines: ITelegramInlineKeyboard[] = [];
    const reply: string[] = [];

    buttons.forEach((button) => {
        if (button.url) {
            const inline: ITelegramInlineKeyboard = {
                text: button.title,
                url: button.url,
            };
            if (button.payload) {
                inline.callback_data = button.payload;
                inlines.push(inline);
            }
        } else {
            reply.push(button.title || '');
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
