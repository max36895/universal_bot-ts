import {IViberButton, IViberButtonObject} from "../../components/button/interfaces/IViberButton";

export interface IViberUserInfo {
    /**
     * Уникальный идентификатор пользователя Viber.
     */
    id: string;
    /**
     * Имя пользователя Viber.
     */
    name?: string;
    /**
     * URL-адрес аватара пользователя.
     */
    avatar: string;
    /**
     * Код страны пользователя.
     */
    country?: string;
    /**
     * Язык телефона пользователя. Будет возвращен в соответствии с языком устройства.
     */
    language?: string;
    /**
     * Тип операционной системы и версия основного устройства пользователя.
     */
    primary_device_os: string;
    /**
     * Версия Viber, установленная на основном устройстве пользователя.
     */
    api_version: number;
    /**
     * Версия Viber, установленная на основном устройстве пользователя.
     */
    viber_version: string;
    /**
     * Мобильный код страны.
     */
    mss?: number;
    /**
     * Код мобильной сети.
     */
    mnc?: number;
    /**
     * Тип устройства пользователя.
     */
    device_type: string;
}

export interface IViberSender {
    /**
     * Имя отправителя для отображения (Максимум 28 символов).
     */
    name: string;
    /**
     * URL-адрес Аватара отправителя (Размер аватара должен быть не более 100 Кб. Рекомендуется 720x720).
     */
    avatar: string;
}

export interface IViberGetUserDetails {
    /**
     * Результат действия.
     */
    status: number;
    /**
     * Статус сообщения.
     */
    status_message: string;
    /**
     * Уникальный идентификатор сообщения.
     */
    message_token: number;
    user: IViberUserInfo;
}

export interface IViberWebhookParams {
    url?: string;
    event_types?: string[];
    send_name?: boolean;
    send_photo?: boolean;
}

export interface IViberRichMediaParams {
    receiver?: string;
    type?: string;
    rich_media?: {
        Type: string;
        ButtonsGroupColumns: number;
        ButtonsGroupRows: number;
        BgColor: string;
        Buttons: IViberButton[];
    }
}

export interface IViberParams {
    /**
     * Уникальный идентификатор пользователя Viber.
     */
    receiver?: string;
    /**
     * Тип сообщения. (Доступные типы сообщений: text, picture, video, file, location, contact, sticker, carousel content и url).
     */
    type?: string;
    /**
     * Отправитель.
     */
    sender?: string;
    /**
     * Разрешить учетной записи отслеживать сообщения и ответы пользователя. Отправлено tracking_data значение будет передано обратно с ответом пользователя.
     */
    tracking_data?: string;
    /**
     * Минимальная версия API, необходимая клиентам для этого сообщения (по умолчанию 1).
     */
    min_api_version?: string;
    /**
     * Текст сообщения. (Обязательный параметр).
     */
    text?: string;
    /**
     * Url адрес отправляемого контента. Актуально при отправке файлов.
     */
    media?: string;
    /**
     * URL-адрес изображения уменьшенного размера. Актуально при отправке файлов.
     */
    thumbnail?: string;
    /**
     * Размер файла в байтах.
     */
    size?: number;
    /**
     * Продолжительность видео или аудио в секундах. Будет отображаться на приемнике.
     */
    duration?: number;
    /**
     * Имя файла. Актуально для type = file.
     */
    file_name?: string;
    /**
     * Контакты пользователя. Актуально для type = contact.
     */
    contact?: {
        /**
         * Имя контактного лица.
         */
        name: string;
        /**
         * Номер телефона контактного лица.
         */
        phone_number: string;
    }
    /**
     * Координаты местоположения. Актуально для type = location.
     */
    location?: {
        /**
         * Координата lat.
         */
        lat: string;
        /**
         * Координата lon.
         */
        lon: string;
    }
    /**
     * Уникальный идентификатор стикера Viber. Актуально для type = sticker.
     */
    sticker_id?: number;
    keyboard?: IViberButtonObject;
}
