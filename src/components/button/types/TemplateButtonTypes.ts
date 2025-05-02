import { Button } from '../Button';

/**
 * @abstract class TemplateButtonTypes
 * Шаблонный класс для работы с кнопками в различных платформах
 *
 * Используется для унификации работы с кнопками в разных платформах:
 * - Алиса: кнопки в навыке
 * - Маруся: кнопки в навыке
 * - Telegram: inline-кнопки и кнопки клавиатуры
 * - Viber: кнопки в чате
 * - VK: кнопки в сообщениях
 *
 * @example
 * ```typescript
 * class AlisaButton extends TemplateButtonTypes {
 *     public getButtons(): any {
 *         return this.buttons.map(button => ({
 *             title: button.title,
 *             url: button.url
 *         }));
 *     }
 * }
 *
 * class TelegramButton extends TemplateButtonTypes {
 *     public getButtons(): any {
 *         return {
 *             inline_keyboard: this.buttons.map(button => [{
 *                 text: button.title,
 *                 callback_data: button.url
 *             }])
 *         };
 *     }
 * }
 * ```
 */
export abstract class TemplateButtonTypes {
    /**
     * Массив кнопок для отображения
     *
     *                               о кнопках (заголовок, URL, действия и т.д.)
     *
     * @example
     * ```typescript
     * const buttonHandler = new AlisaButton();
     * buttonHandler.buttons = [
     *     new Button('Открыть сайт', 'https://example.com'),
     *     new Button('Позвонить', 'tel:+79001234567')
     * ];
     * ```
     */
    public buttons: Button[];

    /**
     * Конструктор класса
     *
     * Инициализирует пустой массив кнопок
     */
    public constructor() {
        this.buttons = [];
    }

    /**
     * Получение массива кнопок в формате, специфичном для платформы
     *
     * @abstract
     * @returns {any} - Кнопки в формате, специфичном для платформы:
     *                  - Алиса/Маруся: массив объектов с title и url
     *                  - Telegram: объект с inline_keyboard или keyboard
     *                  - Viber: массив объектов с Text и ActionBody
     *                  - VK: массив объектов с action и label
     *
     * @example
     * ```typescript
     * const buttonHandler = new AlisaButton();
     * buttonHandler.buttons = [
     *     new Button('Открыть сайт', 'https://example.com')
     * ];
     *
     * const result = buttonHandler.getButtons();
     * // result: [{ title: 'Открыть сайт', url: 'https://example.com' }]
     * ```
     */
    public abstract getButtons(): any;
}
