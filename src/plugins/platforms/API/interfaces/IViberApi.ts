import { IViberButton, IViberButtonObject } from '../../Viber/interfaces/IViberPlatform';

/**
 * Интерфейс с результатом выполнения запроса к API Viber
 *
 * @example
 * ```ts
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
     * Описание результата выполнения запроса
     */
    status_message?: string;

    /**
     * Список получателей, которым не удалось отправить сообщение
     * Массив идентификаторов пользователей
     */
    failed_list?: string[];

    /**
     * Результат действия
     * 0 - успешно, 1 - ошибка
     */
    status?: number;
}

/**
 * Интерфейс с информацией о пользователе Viber
 *
 * @example
 * ```ts
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
     */
    id: string;

    /**
     * Имя пользователя Viber
     */
    name?: string;

    /**
     * URL-адрес аватара пользователя
     */
    avatar: string;

    /**
     * Код страны пользователя
     * ISO 3166-1 alpha-2 код страны
     */
    country?: string;

    /**
     * Язык телефона пользователя.
     * Будет возвращен в соответствии с языком устройства
     */
    language?: string;

    /**
     * Тип операционной системы и версия основного устройства пользователя
     */
    primary_device_os: string;

    /**
     * Версия API Viber
     */
    api_version: number;

    /**
     * Версия Viber, установленная на основном устройстве пользователя
     */
    viber_version: string;

    /**
     * Мобильный код страны
     */
    mss?: number;

    /**
     * Код мобильной сети
     */
    mnc?: number;

    /**
     * Тип устройства пользователя
     */
    device_type: string;
}

/**
 * Интерфейс с информацией об отправителе сообщения
 *
 * @example
 * ```ts
 * const sender: IViberSender = {
 *   name: "My Bot",
 *   avatar: "https://example.com/bot-avatar.jpg"
 * };
 * ```
 */
export interface IViberSender {
    /**
     * Имя отправителя для отображения
     * Максимум 28 символов
     */
    name: string;

    /**
     * URL-адрес аватара отправителя
     * Размер аватара должен быть не более 100 Кб. Рекомендуется 720x720
     */
    avatar: string;
}

/**
 * Интерфейс с информацией о пользователе, полученной через API
 *
 * @example
 * ```ts
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
     */
    message_token: number;

    /**
     * Информация о пользователе
     */
    user: IViberUserInfo;
}

/**
 * Интерфейс с параметрами настройки webhook`а
 *
 * @example
 * ```ts
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
     */
    url?: string;

    /**
     * Типы событий для получения уведомлений
     */
    event_types?: string[];

    /**
     * Отправлять имя пользователя в уведомлениях
     */
    send_name?: boolean;

    /**
     * Отправлять фото пользователя в уведомлениях
     */
    send_photo?: boolean;
}

/**
 * Интерфейс с параметрами для отправки Rich Media сообщения
 *
 * @example
 * ```ts
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
     */
    receiver?: string;

    /**
     * Тип сообщения
     */
    type?: string;

    /**
     * Параметры Rich Media
     */
    rich_media?: {
        /**
         * Тип Rich Media
         */
        Type: string;

        /**
         * Количество колонок в группе кнопок
         */
        ButtonsGroupColumns: number;

        /**
         * Количество строк в группе кнопок
         */
        ButtonsGroupRows: number;

        /**
         * Цвет фона
         */
        BgColor: string;

        /**
         * Массив кнопок
         */
        Buttons: IViberButton[];
    };
}

/**
 * Интерфейс с параметрами для отправки сообщения
 *
 * @example
 * ```ts
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
     */
    receiver?: string;

    /**
     * Тип сообщения
     * Доступные типы: text, picture, video, file, location, contact, sticker, carousel content, url
     */
    type?: string;

    /**
     * Информация об отправителе
     */
    sender?: IViberSender;

    /**
     * Данные для отслеживания.
     * Разрешает учетной записи отслеживать сообщения и ответы пользователя
     */
    tracking_data?: string;

    /**
     * Минимальная версия API
     * @defaultValue "1"
     */
    min_api_version?: string;

    /**
     * Текст сообщения
     * Обязательный параметр для текстовых сообщений
     */
    text?: string;

    /**
     * URL адрес отправляемого контента
     * Актуально при отправке файлов, изображений, видео
     */
    media?: string;

    /**
     * URL-адрес изображения уменьшенного размера
     * Актуально при отправке файлов, изображений, видео
     */
    thumbnail?: string;

    /**
     * Размер файла в байтах
     */
    size?: number;

    /**
     * Продолжительность видео или аудио в секундах.
     * Будет отображаться на приемнике
     */
    duration?: number;

    /**
     * Имя файла
     * Актуально для type = file
     */
    file_name?: string;

    /**
     * Контакты пользователя
     * Актуально для type = contact
     */
    contact?: {
        /**
         * Имя контактного лица
         */
        name: string;

        /**
         * Номер телефона контактного лица
         */
        phone_number: string;
    };

    /**
     * Координаты местоположения
     * Актуально для type = location
     */
    location?: {
        /**
         * Координата широты
         */
        lat: string;

        /**
         * Координата долготы
         */
        lon: string;
    };

    /**
     * Уникальный идентификатор стикера Viber
     * Актуально для type = sticker
     */
    sticker_id?: number;

    /**
     * Клавиатура с кнопками
     */
    keyboard?: IViberButtonObject;
}
