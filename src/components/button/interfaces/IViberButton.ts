/**
 * @interface IViberButton
 * Интерфейс для кнопки Viber.
 *
 * Определяет структуру и визуальное представление кнопки в Viber.
 *
 * @example
 * ```typescript
 * const button: IViberButton = {
 *     Columns: 6,
 *     Rows: 1,
 *     ActionType: 'reply',
 *     ActionBody: 'button_click',
 *     Text: 'Нажми меня',
 *     TextSize: 'regular',
 *     TextVAlign: 'middle',
 *     TextHAlign: 'center',
 *     Image: 'https://example.com/button.png'
 * };
 * ```
 */
export interface IViberButton {
    /**
     * Количество колонок, которые занимает кнопка.
     * Максимальное значение - 6.
     * @type {number}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Columns: 6, // Кнопка занимает всю ширину
     *     Text: 'Нажми меня'
     * };
     * ```
     */
    Columns?: number;

    /**
     * Количество строк, которые занимает кнопка.
     * Максимальное значение - 2.
     * @type {number}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Rows: 2, // Кнопка занимает две строки
     *     Text: 'Нажми меня'
     * };
     * ```
     */
    Rows?: number;

    /**
     * Тип действия кнопки.
     * Возможные значения:
     * - reply - отправка сообщения
     * - open-url - открытие URL
     * - share-phone - поделиться номером телефона
     * - location-picker - выбор местоположения
     * @type {string}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     ActionType: 'reply',
     *     ActionBody: 'button_click',
     *     Text: 'Нажми меня'
     * };
     * ```
     */
    ActionType?: string;

    /**
     * Данные, которые будут отправлены при нажатии на кнопку.
     * Для кнопок типа reply - текст сообщения
     * Для кнопок типа open-url - URL для перехода
     * @type {string | null}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     ActionType: 'reply',
     *     ActionBody: 'button_click',
     *     Text: 'Нажми меня'
     * };
     * ```
     */
    ActionBody?: string | null;

    /**
     * Текст, отображаемый на кнопке.
     * @type {string | null}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Text: 'Нажми меня'
     * };
     * ```
     */
    Text?: string | null;

    /**
     * Размер текста на кнопке.
     * Возможные значения:
     * - small - маленький текст
     * - regular - обычный текст
     * - large - большой текст
     * @type {string}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Text: 'Нажми меня',
     *     TextSize: 'large'
     * };
     * ```
     */
    TextSize?: string;

    /**
     * Вертикальное выравнивание текста.
     * Возможные значения:
     * - top - по верхнему краю
     * - middle - по центру
     * - bottom - по нижнему краю
     * @type {string}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Text: 'Нажми меня',
     *     TextVAlign: 'middle'
     * };
     * ```
     */
    TextVAlign?: string;

    /**
     * Горизонтальное выравнивание текста.
     * Возможные значения:
     * - left - по левому краю
     * - center - по центру
     * - right - по правому краю
     * @type {string}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Text: 'Нажми меня',
     *     TextHAlign: 'center'
     * };
     * ```
     */
    TextHAlign?: string;

    /**
     * URL изображения для кнопки.
     * Изображение будет отображаться на кнопке.
     * @type {string}
     * @example
     * ```typescript
     * const button: IViberButton = {
     *     Text: 'Нажми меня',
     *     Image: 'https://example.com/button.png'
     * };
     * ```
     */
    Image?: string;
}

/**
 * @interface IViberButtonObject
 * Интерфейс для объекта, содержащего коллекцию кнопок Viber.
 *
 * Используется для создания клавиатуры с кнопками в Viber.
 *
 * @example
 * ```typescript
 * const keyboard: IViberButtonObject = {
 *     DefaultHeight: true,
 *     BgColor: '#FFFFFF',
 *     Buttons: [
 *         {
 *             Columns: 6,
 *             Rows: 1,
 *             ActionType: 'reply',
 *             ActionBody: 'button_click',
 *             Text: 'Нажми меня',
 *             TextSize: 'regular',
 *             TextVAlign: 'middle',
 *             TextHAlign: 'center'
 *         }
 *     ]
 * };
 * ```
 */
export interface IViberButtonObject {
    /**
     * Определяет, будет ли использоваться стандартная высота кнопок.
     * @type {boolean}
     * @example
     * ```typescript
     * const keyboard: IViberButtonObject = {
     *     DefaultHeight: true,
     *     Buttons: [...]
     * };
     * ```
     */
    DefaultHeight: boolean;

    /**
     * Цвет фона клавиатуры.
     * Может быть указан в формате HEX (#RRGGBB).
     * @type {string}
     * @example
     * ```typescript
     * const keyboard: IViberButtonObject = {
     *     BgColor: '#FFFFFF',
     *     Buttons: [...]
     * };
     * ```
     */
    BgColor: string;

    /**
     * Массив кнопок клавиатуры.
     * @type {IViberButton[]}
     * @example
     * ```typescript
     * const keyboard: IViberButtonObject = {
     *     DefaultHeight: true,
     *     BgColor: '#FFFFFF',
     *     Buttons: [
     *         {
     *             Columns: 6,
     *             Rows: 1,
     *             Text: 'Кнопка 1'
     *         },
     *         {
     *             Columns: 6,
     *             Rows: 1,
     *             Text: 'Кнопка 2'
     *         }
     *     ]
     * };
     * ```
     */
    Buttons: IViberButton[];

    /**
     * Тип клавиатуры.
     * @type {string}
     * @example
     * ```typescript
     * const keyboard: IViberButtonObject = {
     *     Type: 'keyboard',
     *     Buttons: [...]
     * };
     * ```
     */
    Type?: string;
}
