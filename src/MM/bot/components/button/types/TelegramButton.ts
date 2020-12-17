import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {TButtonPayload} from "../interfaces/button";

export interface ITelegramInlineKeyboard {
    /**
     * Текст внутри кнопки
     */
    text: string,
    /**
     * Ссылка по которой передет пользователь после нажатия
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
     * Кнопки в виде кнопок. ОТображаются вместо клавиатуры
     */
    keyboard?: string[];
    /**
     * Удалить все кнопки
     */
    remove_keyboard?: boolean;
}

/**
 * Класс отвечающий за отображение кнопок в Телеграме
 * Class TelegramButton
 * @class bot\components\button\types
 */
export class TelegramButton extends TemplateButtonTypes {
    /**
     * Получить массив с кнопками для ответа пользователю.
     *
     * @return ITelegramKeyboard
     * @api
     */
    public getButtons(): ITelegramKeyboard {
        let objects: ITelegramKeyboard = {};
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
                reply.push(button.title);
            }
        });
        const rCount = reply.length;
        const rInline = inlines.length;
        if (rCount || rInline) {
            if (rInline) {
                objects.inline_keyboard = inlines;
            }
            if (rCount) {
                objects.keyboard = reply;
            }
        } else {
            // Удаляем клавиатуру из-за ненадобности
            objects = {remove_keyboard: true};
        }
        return objects;
    }
}
