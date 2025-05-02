/**
 * @interface IVkButtonObject
 * Интерфейс для объекта, содержащего коллекцию кнопок VK.
 *
 * Используется для создания клавиатуры с кнопками в VK.
 *
 * @example
 * ```typescript
 * const keyboard: IVkButtonObject = {
 *     one_time: false,
 *     buttons: [
 *         [{
 *             action: {
 *                 type: 'text',
 *                 label: 'Нажми меня'
 *             },
 *             color: 'primary'
 *         }]
 *     ]
 * };
 * ```
 */
export interface IVkButtonObject {
    /**
     * Определяет, будет ли клавиатура скрыта после нажатия на кнопку.
     * true - клавиатура скроется после нажатия
     * false - клавиатура останется видимой
     * @type {boolean}
     * @example
     * ```typescript
     * const keyboard: IVkButtonObject = {
     *     one_time: true, // Клавиатура скроется после нажатия
     *     buttons: [...]
     * };
     * ```
     */
    one_time: boolean;

    /**
     * Массив кнопок или массив массивов кнопок.
     * Каждый внутренний массив представляет собой строку кнопок.
     * @type {IVkButton[] | IVkButton[][] | any}
     * @example
     * ```typescript
     * const keyboard: IVkButtonObject = {
     *     one_time: false,
     *     buttons: [
     *         // Первая строка кнопок
     *         [{
     *             action: { type: 'text', label: 'Кнопка 1' },
     *             color: 'primary'
     *         }],
     *         // Вторая строка кнопок
     *         [{
     *             action: { type: 'text', label: 'Кнопка 2' },
     *             color: 'secondary'
     *         }]
     *     ]
     * };
     * ```
     */
    buttons: IVkButton[] | IVkButton[][] | any;
}

/**
 * @interface IVkButtonAction
 * Интерфейс для действия кнопки VK.
 *
 * Определяет тип действия, которое будет выполнено при нажатии на кнопку.
 *
 * @example
 * ```typescript
 * // Текстовая кнопка
 * const textAction: IVkButtonAction = {
 *     type: 'text',
 *     label: 'Нажми меня'
 * };
 *
 * // Кнопка-ссылка
 * const linkAction: IVkButtonAction = {
 *     type: 'open_link',
 *     link: 'https://example.com',
 *     label: 'Перейти на сайт'
 * };
 * ```
 */
export interface IVkButtonAction {
    /**
     * Тип действия кнопки.
     * Возможные значения:
     * - text - текстовая кнопка
     * - open_link - кнопка-ссылка
     * - location - кнопка геолокации
     * - vkpay - кнопка оплаты
     * - open_app - кнопка открытия приложения
     * @type {string}
     * @example
     * ```typescript
     * const action: IVkButtonAction = {
     *     type: 'text',
     *     label: 'Нажми меня'
     * };
     * ```
     */
    type?: string;

    /**
     * URL для перехода при нажатии на кнопку.
     * Используется только для кнопок типа open_link.
     * @type {string}
     * @example
     * ```typescript
     * const action: IVkButtonAction = {
     *     type: 'open_link',
     *     link: 'https://example.com',
     *     label: 'Перейти на сайт'
     * };
     * ```
     */
    link?: string;

    /**
     * Текст, отображаемый на кнопке.
     * @type {string | null}
     * @example
     * ```typescript
     * const action: IVkButtonAction = {
     *     type: 'text',
     *     label: 'Нажми меня'
     * };
     * ```
     */
    label?: string | null;

    /**
     * Дополнительные данные, передаваемые при нажатии на кнопку.
     * Могут быть строкой или объектом.
     * @type {string | object}
     * @example
     * ```typescript
     * const action: IVkButtonAction = {
     *     type: 'text',
     *     label: 'Добавить в корзину',
     *     payload: {
     *         action: 'add_to_cart',
     *         productId: 123
     *     }
     * };
     * ```
     */
    payload?: string | object;
}

/**
 * @interface IVkButton
 * Интерфейс для кнопки VK.
 *
 * Определяет структуру кнопки и её визуальное представление.
 *
 * @example
 * ```typescript
 * const button: IVkButton = {
 *     action: {
 *         type: 'text',
 *         label: 'Нажми меня',
 *         payload: { action: 'click' }
 *     },
 *     color: 'primary'
 * };
 * ```
 */
export interface IVkButton {
    /**
     * Действие кнопки.
     * Определяет тип действия и его параметры.
     * @type {IVkButtonAction}
     * @example
     * ```typescript
     * const button: IVkButton = {
     *     action: {
     *         type: 'text',
     *         label: 'Нажми меня'
     *     }
     * };
     * ```
     */
    action: IVkButtonAction;

    /**
     * Цвет кнопки.
     * Возможные значения:
     * - primary - основная кнопка (синяя)
     * - secondary - вторичная кнопка (белая)
     * - negative - отрицательная кнопка (красная)
     * - positive - положительная кнопка (зеленая)
     * @type {string}
     * @example
     * ```typescript
     * const button: IVkButton = {
     *     action: { type: 'text', label: 'Нажми меня' },
     *     color: 'primary'
     * };
     * ```
     */
    color?: string;

    /**
     * Хеш кнопки.
     * Используется для верификации кнопки.
     * @type {string}
     * @example
     * ```typescript
     * const button: IVkButton = {
     *     action: { type: 'text', label: 'Нажми меня' },
     *     hash: 'abc123'
     * };
     * ```
     */
    hash?: string;

    /**
     * Дополнительные данные кнопки.
     * Могут содержать любую информацию.
     * @type {any}
     * @example
     * ```typescript
     * const button: IVkButton = {
     *     action: { type: 'text', label: 'Нажми меня' },
     *     payload: {
     *         customData: 'value'
     *     }
     * };
     * ```
     */
    payload?: any;

    /**
     * Идентификатор группы кнопки.
     * Используется для группировки кнопок.
     * @type {any}
     * @example
     * ```typescript
     * const button: IVkButton = {
     *     action: { type: 'text', label: 'Нажми меня' },
     *     _group: 'navigation'
     * };
     * ```
     */
    _group?: any;
}
