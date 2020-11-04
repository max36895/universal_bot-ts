/**
 * Класс отвечающий за отображение кнопок в Телеграме
 * Class TelegramButton
 * @package bot\components\button\types
 */
import {TemplateButtonTypes} from "./TemplateButtonTypes";
import {TButtonPayload} from "../interfaces/button";

export interface ITelegramInlineKeyboard {
    text: string,
    url?: string;
    callback_data?: TButtonPayload;
}

export interface ITelegramKeyboard {
    inline_keyboard?: ITelegramInlineKeyboard[];
    keyboard?: string[];
    remove_keyboard?: boolean;
}

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
            //if (button.hide === Button.B_BTN) {
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
            /*} else {
                const inline: ITelegramInlineKeyboard = {
                    text: button.title
                };
                if (button.url) {
                    inline.url = button.url;
                }
                if (button.payload) {
                    inline.callback_data = button.payload;
                    inlines.push(inline);
                } else if (typeof inline.url === 'undefined') {
                    reply.push(button.title);
                }
            }*/
        })
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
