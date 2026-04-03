/**
 * Тип для дополнительных данных кнопки.
 * Может содержать любые данные, которые будут переданы при нажатии на кнопку.
 *
 *
 * @example
 * ```ts
 * // Простой payload с действием
 * const payload: TButtonPayload = { action: 'click' };
 *
 * // Сложный payload с данными
 * const payload: TButtonPayload = {
 *     action: 'add_to_cart',
 *     productId: 123,
 *     quantity: 1,
 *     metadata: {
 *         source: 'catalog',
 *         timestamp: Date.now()
 *     }
 * };
 * ```
 */

/**
 * @interface IButtonOptions
 * Интерфейс для дополнительных опций кнопки.
 *
 * Позволяет настраивать внешний вид и поведение кнопки на различных платформах.
 * Поддерживает как общие опции, так и специфичные для конкретных платформ.
 *
 * @example
 * ```ts
 * // Специфичные опции для VK
 * const vkOptions: IButtonOptions = {
 *     _group: 'vk_buttons',
 *     color: 'blue',
 *     size: 'large',
 *     vk_style: 'primary'
 * };
 *
 * // Специфичные опции для Telegram
 * const telegramOptions: IButtonOptions = {
 *     _group: 'tg_buttons',
 *     color: 'primary',
 *     size: 'large',
 *     request_contact: true
 * };
 * ```
 */
export interface IButtonOptions {
    /**
     * Идентификатор группы для кнопки.
     * Используется для объединения кнопок в логические группы.
     * Позволяет организовать кнопки по категориям или функциональности.
     *
     * @example
     * ```ts
     * // Группировка кнопок навигации
     * const options: IButtonOptions = {
     *     _group: 'nav_buttons'
     * };
     *
     * // Группировка кнопок действий
     * const options: IButtonOptions = {
     *     _group: 'action_buttons'
     * };
     * ```
     */
    _group?: string | number;
    /**
     * Источник перехода
     */
    utmSource?: string;
    /**
     * Тип рекламного канала
     */
    utmMedium?: string;
    /**
     * Название рекламной кампании
     */
    utmCampaign?: string;

    /**
     * Дополнительные опции для кнопки.
     * Могут включать специфичные для платформы настройки.
     *
     * @example
     * ```ts
     * // Настройка кнопки для VK
     * const options: IButtonOptions = {
     *     color: 'primary',
     *     size: 'large',
     *     vk_style: 'primary'
     * };
     *
     * // Настройка кнопки для Telegram
     * const options: IButtonOptions = {
     *     request_contact: true,
     *     request_location: false
     * };
     * ```
     */
    [name: string]: unknown;
}

/**
 * Интерфейс для определения структуры кнопки.
 *
 * Определяет основные свойства кнопки, которые используются на всех платформах.
 * Поддерживает различные типы кнопок: текстовые, ссылки, с payload и т.д.
 *
 * @example
 * ```ts
 * // Создание простой текстовой кнопки
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
 *
 * // Создание кнопки с контактом (Telegram)
 * const contactButton: IButton = {
 *     title: 'Отправить контакт',
 *     options: { request_contact: true }
 * };
 *
 * // Создание кнопки с локацией (Telegram)
 * const locationButton: IButton = {
 *     title: 'Отправить локацию',
 *     options: { request_location: true }
 * };
 * ```
 */
export interface IButton {
    /**
     * Заголовок кнопки.
     * Основной текст, отображаемый на кнопке.
     *
     * @example
     * ```ts
     * const button: IButton = {
     *     title: 'Нажми меня'
     * };
     * ```
     */
    title?: string;

    /**
     * Альтернативный текст кнопки.
     * Используется в некоторых платформах вместо title.
     * Например, в VK API используется text вместо title.
     *
     * @example
     * ```ts
     * const button: IButton = {
     *     text: 'Нажми меня'
     * };
     * ```
     */
    text?: string;

    /**
     * URL для перехода при нажатии на кнопку.
     * Используется для кнопок-ссылок.
     *
     * @example
     * ```ts
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
     * Используется для передачи контекста или параметров действия.
     *
     * @example
     * ```ts
     * // Простой payload
     * const button: IButton = {
     *     title: 'Добавить в корзину',
     *     payload: {
     *         action: 'add_to_cart',
     *         productId: 123
     *     }
     * };
     *
     * // Сложный payload с метаданными
     * const button: IButton = {
     *     title: 'Оформить заказ',
     *     payload: {
     *         action: 'checkout',
     *         orderId: 456,
     *         metadata: {
     *             source: 'cart',
     *             timestamp: Date.now(),
     *             userPreferences: {
     *                 delivery: 'express',
     *                 payment: 'card'
     *             }
     *         }
     *     }
     * };
     * ```
     */
    payload?: object;

    /**
     * Дополнительные параметры кнопки.
     * Влияют на внешний вид и поведение кнопки.
     * Могут включать как общие, так и платформо-специфичные настройки.
     *
     * @example
     * ```ts
     * // Платформо-специфичные настройки
     * const button: IButton = {
     *     title: 'Отправить контакт',
     *     options: {
     *         request_contact: true,
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
 * Упрощенный вариант для быстрого создания простых кнопок.
 *
 * @example
 * ```ts
 * // Кнопка как строка (упрощенный вариант)
 * const simpleButton: TButton = 'Нажми меня';
 *
 * // Кнопка как объект (полный вариант)
 * const complexButton: TButton = {
 *     title: 'Нажми меня',
 *     payload: { action: 'click' }
 * };
 *
 * // Массив кнопок разных типов
 * const buttons: TButton[] = [
 *     'Простая кнопка',
 *     {
 *         title: 'Сложная кнопка',
 *         payload: { action: 'complex' }
 *     }
 * ];
 * ```
 */
export type TButton = string | IButton;
