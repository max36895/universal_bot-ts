/**
 * Тип для дополнительных данных кнопки.
 * Может содержать любые данные, которые будут переданы при нажатии на кнопку.
 * @typedef {any} TButtonPayload
 */
export type TButtonPayload = any;

/**
 * @interface IButtonOptions
 * Интерфейс для дополнительных опций кнопки.
 *
 * Позволяет настраивать внешний вид и поведение кнопки на различных платформах.
 *
 * @example
 * ```typescript
 * // Группировка кнопок
 * const options: IButtonOptions = {
 *     _group: 'navigation',
 *     color: 'primary',
 *     size: 'large'
 * };
 * ```
 */
export interface IButtonOptions {
    /**
     * Идентификатор группы для кнопки.
     * Используется для объединения кнопок в логические группы.
     * @type {string | number}
     * @example
     * ```typescript
     * // Группировка кнопок навигации
     * const options: IButtonOptions = {
     *     _group: 'nav_buttons'
     * };
     * ```
     */
    _group?: string | number;

    /**
     * Дополнительные опции для кнопки.
     * Могут включать специфичные для платформы настройки.
     * @type {any}
     * @example
     * ```typescript
     * // Настройка кнопки для VK
     * const options: IButtonOptions = {
     *     color: 'primary',
     *     size: 'large'
     * };
     * ```
     */
    [name: string]: any;
}

/**
 * @interface IButton
 * Интерфейс для определения структуры кнопки.
 *
 * Определяет основные свойства кнопки, которые используются на всех платформах.
 *
 * @example
 * ```typescript
 * // Создание простой кнопки
 * const button: IButton = {
 *     title: 'Нажми меня',
 *     payload: { action: 'click' }
 * };
 *
 * // Создание кнопки-ссылки
 * const linkButton: IButton = {
 *     title: 'Перейти на сайт',
 *     url: 'https://example.com',
 *     options: { color: 'primary' }
 * };
 * ```
 */
export interface IButton {
    /**
     * Заголовок кнопки.
     * Основной текст, отображаемый на кнопке.
     * @type {string}
     * @example
     * ```typescript
     * const button: IButton = {
     *     title: 'Нажми меня'
     * };
     * ```
     */
    title?: string;

    /**
     * Альтернативный текст кнопки.
     * Используется в некоторых платформах вместо title.
     * @type {string}
     * @example
     * ```typescript
     * const button: IButton = {
     *     text: 'Нажми меня'
     * };
     * ```
     */
    text?: string;

    /**
     * URL для перехода при нажатии на кнопку.
     * Используется для кнопок-ссылок.
     * @type {string}
     * @example
     * ```typescript
     * const button: IButton = {
     *     title: 'Перейти на сайт',
     *     url: 'https://example.com'
     * };
     * ```
     */
    url?: string;

    /**
     * Дополнительные данные, передаваемые при нажатии на кнопку.
     * Могут содержать любую информацию, необходимую для обработки нажатия.
     * @type {TButtonPayload}
     * @example
     * ```typescript
     * const button: IButton = {
     *     title: 'Добавить в корзину',
     *     payload: {
     *         action: 'add_to_cart',
     *         productId: 123
     *     }
     * };
     * ```
     */
    payload?: TButtonPayload;

    /**
     * Дополнительные параметры кнопки.
     * Влияют на внешний вид и поведение кнопки.
     * @type {IButtonOptions}
     * @example
     * ```typescript
     * const button: IButton = {
     *     title: 'Нажми меня',
     *     options: {
     *         color: 'primary',
     *         size: 'large'
     *     }
     * };
     * ```
     */
    options?: IButtonOptions;
}

/**
 * Тип для кнопки.
 * Может быть либо строкой (текстом кнопки), либо объектом, реализующим интерфейс IButton.
 * @typedef {string | IButton} TButton
 *
 * @example
 * ```typescript
 * // Кнопка как строка
 * const simpleButton: TButton = 'Нажми меня';
 *
 * // Кнопка как объект
 * const complexButton: TButton = {
 *     title: 'Нажми меня',
 *     payload: { action: 'click' }
 * };
 * ```
 */
export type TButton = string | IButton;
