import { TemplateButtonTypes } from './TemplateButtonTypes';
import { TButtonPayload } from '../interfaces';

/**
 * @interface ITelegramInlineKeyboard
 * Интерфейс для inline-кнопок в сообщениях Telegram
 *
 * Используется для создания кнопок, которые отображаются непосредственно в сообщении:
 * - Кнопки-ссылки
 * - Кнопки с callback-данными
 * - Кнопки с URL и callback-данными
 *
 * @example
 * ```typescript
 * const inlineButton: ITelegramInlineKeyboard = {
 *     text: 'Открыть сайт',
 *     url: 'https://example.com',
 *     callback_data: { action: 'open_site' }
 * };
 * ```
 */
export interface ITelegramInlineKeyboard {
    /**
     * Текст внутри кнопки
     */
    text: string | null;
    /**
     * Ссылка по которой перейдёт пользователь после нажатия
     */
    url?: string;
    /**
     * Дополнительные параметры, которые передадутся после нажатия на кнопку
     */
    callback_data?: TButtonPayload;
}

/**
 * @interface ITelegramKeyboard
 * Интерфейс для клавиатуры Telegram
 *
 * Поддерживает три режима работы:
 * - Inline-кнопки в сообщении
 * - Reply-кнопки вместо клавиатуры
 * - Удаление клавиатуры
 *
 * @example
 * ```typescript
 * // Inline-кнопки
 * const inlineKeyboard: ITelegramKeyboard = {
 *     inline_keyboard: [
 *         [{ text: 'Кнопка 1', url: 'https://example.com/1' }],
 *         [{ text: 'Кнопка 2', callback_data: { action: 'button2' } }]
 *     ]
 * };
 *
 * // Reply-кнопки
 * const replyKeyboard: ITelegramKeyboard = {
 *     keyboard: ['Кнопка 1', 'Кнопка 2']
 * };
 *
 * // Удаление клавиатуры
 * const removeKeyboard: ITelegramKeyboard = {
 *     remove_keyboard: true
 * };
 * ```
 */
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
 * @class TelegramButton
 * Класс для работы с кнопками в Telegram
 *
 * Предоставляет функциональность для создания и отображения кнопок в Telegram:
 * - Поддержка inline-кнопок в сообщениях
 * - Поддержка reply-кнопок вместо клавиатуры
 * - Автоматическое определение типа кнопок
 * - Возможность удаления клавиатуры
 *
 * @extends {TemplateButtonTypes}
 *
 * @example
 * ```typescript
 * const telegramButton = new TelegramButton();
 *
 * // Создание inline-кнопок
 * telegramButton.buttons = [
 *     new Button('Открыть сайт', 'https://example.com'),
 *     new Button('Действие', null, { action: 'custom_action' })
 * ];
 * const inlineResult = telegramButton.getButtons();
 * // inlineResult: {
 * //   inline_keyboard: [
 * //     [{ text: 'Открыть сайт', url: 'https://example.com' }],
 * //     [{ text: 'Действие', callback_data: { action: 'custom_action' } }]
 * //   ]
 * // }
 *
 * // Создание reply-кнопок
 * telegramButton.buttons = [
 *     new Button('Кнопка 1'),
 *     new Button('Кнопка 2')
 * ];
 * const replyResult = telegramButton.getButtons();
 * // replyResult: {
 * //   keyboard: ['Кнопка 1', 'Кнопка 2']
 * // }
 * ```
 */
export class TelegramButton extends TemplateButtonTypes {
    /**
     * Получение кнопок в формате Telegram
     *
     * @returns {ITelegramKeyboard} - Объект с кнопками в формате Telegram:
     *                                - inline_keyboard: для кнопок в сообщении
     *                                - keyboard: для reply-кнопок
     *                                - remove_keyboard: для удаления клавиатуры
     *
     * Правила формирования кнопок:
     * - Если у кнопки есть URL, она становится inline-кнопкой
     * - Если у кнопки есть payload, она становится inline-кнопкой с callback_data
     * - Если у кнопки нет URL и payload, она становится reply-кнопкой
     * - Если нет кнопок, возвращается объект с remove_keyboard: true
     *
     * @example
     * ```typescript
     * const telegramButton = new TelegramButton();
     *
     * // Смешанные кнопки
     * telegramButton.buttons = [
     *     new Button('Сайт', 'https://example.com'),
     *     new Button('Действие', null, { action: 'test' }),
     *     new Button('Простая кнопка')
     * ];
     *
     * const result = telegramButton.getButtons();
     * // result: {
     * //   inline_keyboard: [
     * //     [{ text: 'Сайт', url: 'https://example.com' }],
     * //     [{ text: 'Действие', callback_data: { action: 'test' } }]
     * //   ],
     * //   keyboard: ['Простая кнопка']
     * // }
     * ```
     */
    public getButtons(): ITelegramKeyboard {
        let object: ITelegramKeyboard = {};
        const inlines: ITelegramInlineKeyboard[] = [];
        const reply: string[] = [];

        this.buttons.forEach((button) => {
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
}
