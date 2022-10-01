import {TemplateButtonTypes} from './TemplateButtonTypes';
import {TButtonPayload} from '../interfaces';

export interface ITelegramInlineKeyboard {
    /**
     * Текст внутри кнопки
     */
    text: string | null,
    /**
     * Ссылка по которой перейдёт пользователь после нажатия
     */
    url?: string;
    /**
     * Дополнительные параметры, которые передадутся после нажатия на кнопку
     */
    callback_data?: TButtonPayload;
}

export interface ITelegramKeyboard {
    /**
     * Кнопки в виде ссылки
     */
    inline_keyboard?: ITelegramInlineKeyboard[];
    /**
     * Кнопки в виде кнопок. Отображаются вместо клавиатуры
     */
    keyboard?: string[];
    /**
     * Удалить все кнопки
     */
    remove_keyboard?: boolean;
}

/**
 * Класс отвечающий за отображение кнопок в Телеграме
 * @class TelegramButton
 */
export class TelegramButton extends TemplateButtonTypes {
    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return ITelegramKeyboard
     * @api
     */
    public getButtons(): ITelegramKeyboard {
        let object: ITelegramKeyboard = {};
        const inlines: ITelegramInlineKeyboard[] = [];
        const reply: string[] = [];

        this.buttons.forEach((button) => {
            if (button.url) {
                const inline: ITelegramInlineKeyboard = {
                    text: button.title,
                    url: button.url
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
            object = {remove_keyboard: true};
        }
        return object;
    }
}
