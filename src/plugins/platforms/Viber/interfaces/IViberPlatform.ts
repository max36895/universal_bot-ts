/**
 * Интерфейсы для работы с Viber.
 * Определяют структуру данных для взаимодействия с Viber Bot API
 *
 * Основные компоненты:
 * - Пользователи (IViberUser)
 * - Сообщения (IViberMessage)
 * - Обновления (IViberContent)
 */

/**
 * Информация о пользователе Viber
 */
export interface IViberUser {
    /** Уникальный идентификатор пользователя */
    id: string;
    /** Имя пользователя */
    name: string;
    /** URL аватара пользователя */
    avatar?: string;
    /** Код страны (2 буквы) */
    country?: string;
    /** Язык устройства пользователя */
    language?: string;
    /** Максимальная поддерживаемая версия Viber API */
    api_version: number;
}

/**
 * Сообщение Viber.
 * Поддерживает различные типы контента: текст, медиа, местоположение, контакты
 */
export interface IViberMessage {
    /** Тип сообщения (text, picture, video, file, location, contact, sticker) */
    type: string;
    /** Текст сообщения */
    text: string;
    /**
     * URL медиа-контента
     * Поддерживает: изображения, видео, файлы
     * TTL: 1 час
     */
    media?: string;
    /**
     * Координаты местоположения
     * Используется при type='location'
     */
    location?: {
        /** Широта */
        lat: number;
        /** Долгота */
        lon: number;
    };
    /**
     * Информация о контакте.
     * Используется при type='contact'
     */
    contact?: {
        /** Имя контакта */
        name: string;
        /** Номер телефона */
        phone_number: string;
        /** URL аватара */
        avatar: string;
    };
    /** Данные для отслеживания */
    tracking_data?: string;
    /**
     * Имя файла
     * Используется при type='file'
     */
    file_name?: string;
    /**
     * Размер файла в байтах.
     * Используется при type='file'
     */
    file_size?: number;
    /**
     * Длительность видео в секундах.
     * Используется при type='video'
     */
    duration?: number;
    /**
     * ID стикера
     * Используется при type='sticker'
     */
    sticker_id?: number;
}

/**
 * Обновление от Viber.
 * Содержит информацию о событии и связанных данных
 */
export interface IViberContent {
    /**
     * Тип события
     * Определяет, какое событие вызвало обратный вызов
     */
    event: string;
    /** Время события в формате Unix timestamp */
    timestamp?: number;
    /** Уникальный идентификатор сообщения */
    message_token: number;
    /**
     * Информация об отправителе
     * Для event='message' содержит данные отправителя
     */
    sender: IViberUser;
    /**
     * Информация о пользователе
     * Для event='message' содержит данные отправителя
     */
    user?: IViberUser;
    /** Информация о сообщении */
    message?: IViberMessage;
}

/**
 * @interface IViberButton
 * Интерфейс для кнопки Viber.
 *
 * Определяет структуру и визуальное представление кнопки в Viber.
 *
 * @example
 * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
 * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
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
     * ```ts
     * const keyboard: IViberButtonObject = {
     *     Type: 'keyboard',
     *     Buttons: [...]
     * };
     * ```
     */
    Type?: string;
}

/**
 * @interface IViberCard
 * Интерфейс для карточки в Viber.
 * Расширяет интерфейс IViberButton, добавляя специфичные для Viber свойства.
 *
 * Особенности:
 * - Поддерживает форматированный текст (HTML)
 * - Позволяет настраивать размеры карточки (Columns и Rows от 1 до 6)
 * - Может содержать изображения и кнопки
 * - Поддерживает различные стили текста
 * - Требует обязательные поля ActionType и ActionBody
 *
 * @example
 * ```ts
 * // Создание простой карточки
 * const card: IViberCard = {
 *     Columns: 6, // Максимальная ширина
 *     Rows: 6,    // Максимальная высота
 *     Image: 'https://example.com/image.jpg',
 *     Text: '<font color=#000><b>Заголовок</b></font><br><font color=#ccc>Описание</font>',
 *     ActionType: 'reply',  // Обязательное поле
 *     ActionBody: 'card_action'  // Обязательное поле
 * };
 *
 * // Создание карточки с кнопкой
 * const cardWithButton: IViberCard = {
 *     Columns: 6,
 *     Rows: 6,
 *     Image: 'https://example.com/image.jpg',
 *     Text: '<font color=#000><b>Заголовок</b></font><br><font color=#ccc>Описание</font>',
 *     ActionType: 'reply',
 *     ActionBody: 'button_action',
 *     Buttons: [{
 *         Columns: 6,
 *         Rows: 1,
 *         Text: '<font color=#fff>Нажми меня</font>',
 *         ActionType: 'reply',
 *         ActionBody: 'button_click'
 *     }]
 * };
 * ```
 */
export type IViberCard = IViberButton;
