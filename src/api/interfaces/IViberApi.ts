import { IViberButton, IViberButtonObject } from '../../components/button/interfaces';

/**
 * Интерфейс с результатом выполнения запроса к API Viber
 *
 * @example
 * ```typescript
 * // Успешный ответ
 * const successResponse: IViberApi = {
 *   status: 0,
 *   status_message: "ok"
 * };
 *
 * // Ответ с ошибками
 * const errorResponse: IViberApi = {
 *   status: 1,
 *   status_message: "error",
 *   failed_list: ["user1", "user2"]
 * };
 * ```
 */
export interface IViberApi {
    /**
     * Статус сообщения
     * @type {string}
     * Описание результата выполнения запроса
     */
    status_message?: string;

    /**
     * Список получателей, которым не удалось отправить сообщение
     * @type {string[]}
     * Массив идентификаторов пользователей
     */
    failed_list?: string[];

    /**
     * Результат действия
     * @type {number}
     * 0 - успешно, 1 - ошибка
     */
    status?: number;
}

/**
 * Интерфейс с информацией о пользователе Viber
 *
 * @example
 * ```typescript
 * const userInfo: IViberUserInfo = {
 *   id: "123456789",
 *   name: "John Doe",
 *   avatar: "https://example.com/avatar.jpg",
 *   country: "US",
 *   language: "en",
 *   primary_device_os: "iOS 15.0",
 *   api_version: 8,
 *   viber_version: "12.0.0",
 *   device_type: "iPhone"
 * };
 * ```
 */
export interface IViberUserInfo {
    /**
     * Уникальный идентификатор пользователя Viber
     * @type {string}
     */
    id: string;

    /**
     * Имя пользователя Viber
     * @type {string}
     */
    name?: string;

    /**
     * URL-адрес аватара пользователя
     * @type {string}
     */
    avatar: string;

    /**
     * Код страны пользователя
     * @type {string}
     * ISO 3166-1 alpha-2 код страны
     */
    country?: string;

    /**
     * Язык телефона пользователя
     * @type {string}
     * Будет возвращен в соответствии с языком устройства
     */
    language?: string;

    /**
     * Тип операционной системы и версия основного устройства пользователя
     * @type {string}
     */
    primary_device_os: string;

    /**
     * Версия API Viber
     * @type {number}
     */
    api_version: number;

    /**
     * Версия Viber, установленная на основном устройстве пользователя
     * @type {string}
     */
    viber_version: string;

    /**
     * Мобильный код страны
     * @type {number}
     */
    mss?: number;

    /**
     * Код мобильной сети
     * @type {number}
     */
    mnc?: number;

    /**
     * Тип устройства пользователя
     * @type {string}
     */
    device_type: string;
}

/**
 * Интерфейс с информацией об отправителе сообщения
 *
 * @example
 * ```typescript
 * const sender: IViberSender = {
 *   name: "My Bot",
 *   avatar: "https://example.com/bot-avatar.jpg"
 * };
 * ```
 */
export interface IViberSender {
    /**
     * Имя отправителя для отображения
     * @type {string}
     * Максимум 28 символов
     */
    name: string;

    /**
     * URL-адрес аватара отправителя
     * @type {string}
     * Размер аватара должен быть не более 100 Кб. Рекомендуется 720x720
     */
    avatar: string;
}

/**
 * Интерфейс с информацией о пользователе, полученной через API
 *
 * @example
 * ```typescript
 * const userDetails: IViberGetUserDetails = {
 *   status: 0,
 *   status_message: "ok",
 *   message_token: 123456789,
 *   user: {
 *     id: "123456789",
 *     name: "John Doe",
 *     avatar: "https://example.com/avatar.jpg",
 *     primary_device_os: "iOS 15.0",
 *     api_version: 8,
 *     viber_version: "12.0.0",
 *     device_type: "iPhone"
 *   }
 * };
 * ```
 */
export interface IViberGetUserDetails extends IViberApi {
    /**
     * Уникальный идентификатор сообщения
     * @type {number}
     */
    message_token: number;

    /**
     * Информация о пользователе
     * @type {IViberUserInfo}
     */
    user: IViberUserInfo;
}

/**
 * Интерфейс с параметрами настройки вебхука
 *
 * @example
 * ```typescript
 * const webhookParams: IViberWebhookParams = {
 *   url: "https://example.com/webhook",
 *   event_types: ["message", "delivered", "seen"],
 *   send_name: true,
 *   send_photo: true
 * };
 * ```
 */
export interface IViberWebhookParams {
    /**
     * URL для получения уведомлений
     * @type {string}
     */
    url?: string;

    /**
     * Типы событий для получения уведомлений
     * @type {string[]}
     */
    event_types?: string[];

    /**
     * Отправлять имя пользователя в уведомлениях
     * @type {boolean}
     */
    send_name?: boolean;

    /**
     * Отправлять фото пользователя в уведомлениях
     * @type {boolean}
     */
    send_photo?: boolean;
}

/**
 * Интерфейс с параметрами для отправки Rich Media сообщения
 *
 * @example
 * ```typescript
 * const richMediaParams: IViberRichMediaParams = {
 *   receiver: "123456789",
 *   type: "rich_media",
 *   rich_media: {
 *     Type: "rich_media",
 *     ButtonsGroupColumns: 6,
 *     ButtonsGroupRows: 7,
 *     BgColor: "#FFFFFF",
 *     Buttons: [
 *       {
 *         Columns: 6,
 *         Rows: 3,
 *         Text: "Button 1",
 *         ActionType: "reply",
 *         ActionBody: "button1"
 *       }
 *     ]
 *   }
 * };
 * ```
 */
export interface IViberRichMediaParams {
    /**
     * Идентификатор получателя
     * @type {string}
     */
    receiver?: string;

    /**
     * Тип сообщения
     * @type {string}
     */
    type?: string;

    /**
     * Параметры Rich Media
     * @type {Object}
     */
    rich_media?: {
        /**
         * Тип Rich Media
         * @type {string}
         */
        Type: string;

        /**
         * Количество колонок в группе кнопок
         * @type {number}
         */
        ButtonsGroupColumns: number;

        /**
         * Количество строк в группе кнопок
         * @type {number}
         */
        ButtonsGroupRows: number;

        /**
         * Цвет фона
         * @type {string}
         */
        BgColor: string;

        /**
         * Массив кнопок
         * @type {IViberButton[]}
         */
        Buttons: IViberButton[];
    };
}

/**
 * Интерфейс с параметрами для отправки сообщения
 *
 * @example
 * ```typescript
 * // Текстовое сообщение
 * const textMessage: IViberParams = {
 *   receiver: "123456789",
 *   type: "text",
 *   text: "Hello, world!"
 * };
 *
 * // Сообщение с изображением
 * const imageMessage: IViberParams = {
 *   receiver: "123456789",
 *   type: "picture",
 *   media: "https://example.com/image.jpg",
 *   thumbnail: "https://example.com/thumb.jpg",
 *   text: "Check out this image!"
 * };
 *
 * // Сообщение с контактом
 * const contactMessage: IViberParams = {
 *   receiver: "123456789",
 *   type: "contact",
 *   contact: {
 *     name: "John Doe",
 *     phone_number: "+1234567890"
 *   }
 * };
 * ```
 */
export interface IViberParams {
    /**
     * Уникальный идентификатор пользователя Viber
     * @type {string}
     */
    receiver?: string;

    /**
     * Тип сообщения
     * @type {string}
     * Доступные типы: text, picture, video, file, location, contact, sticker, carousel content, url
     */
    type?: string;

    /**
     * Информация об отправителе
     * @type {IViberSender}
     */
    sender?: string;

    /**
     * Данные для отслеживания
     * @type {string}
     * Разрешает учетной записи отслеживать сообщения и ответы пользователя
     */
    tracking_data?: string;

    /**
     * Минимальная версия API
     * @type {string}
     * @defaultValue "1"
     */
    min_api_version?: string;

    /**
     * Текст сообщения
     * @type {string}
     * Обязательный параметр для текстовых сообщений
     */
    text?: string;

    /**
     * URL адрес отправляемого контента
     * @type {string}
     * Актуально при отправке файлов, изображений, видео
     */
    media?: string;

    /**
     * URL-адрес изображения уменьшенного размера
     * @type {string}
     * Актуально при отправке файлов, изображений, видео
     */
    thumbnail?: string;

    /**
     * Размер файла в байтах
     * @type {number}
     */
    size?: number;

    /**
     * Продолжительность видео или аудио в секундах
     * @type {number}
     * Будет отображаться на приемнике
     */
    duration?: number;

    /**
     * Имя файла
     * @type {string}
     * Актуально для type = file
     */
    file_name?: string;

    /**
     * Контакты пользователя
     * @type {Object}
     * Актуально для type = contact
     */
    contact?: {
        /**
         * Имя контактного лица
         * @type {string}
         */
        name: string;

        /**
         * Номер телефона контактного лица
         * @type {string}
         */
        phone_number: string;
    };

    /**
     * Координаты местоположения
     * @type {Object}
     * Актуально для type = location
     */
    location?: {
        /**
         * Координата широты
         * @type {string}
         */
        lat: string;

        /**
         * Координата долготы
         * @type {string}
         */
        lon: string;
    };

    /**
     * Уникальный идентификатор стикера Viber
     * @type {number}
     * Актуально для type = sticker
     */
    sticker_id?: number;

    /**
     * Клавиатура с кнопками
     * @type {IViberButtonObject}
     */
    keyboard?: IViberButtonObject;
}
