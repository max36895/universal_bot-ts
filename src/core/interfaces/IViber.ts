export interface IViberUser {
    /**
     * Уникальный идентификатор пользователя Viber отправителя сообщения
     */
    id: string;
    /**
     * Имя отправителя Viber
     */
    name: string;
    /**
     * URL-адрес Аватара отправителя
     */
    avatar?: string;
    /**
     * Код страны из 2 букв отправителя
     */
    country?: string;
    /**
     * Язык телефона отправителя. Будет возвращен в соответствии с языком устройства
     */
    language?: string;
    /**
     * Максимальная версия Viber, которая поддерживается всеми устройствами пользователя
     */
    api_version: number
}

export interface IViberMessage {
    /**
     * Тип сообщения
     */
    type: string;
    /**
     * Текст сообщения
     */
    text: string;
    /**
     * URL носителя сообщения-может быть image,video, file и url. URL-адреса изображений/видео/файлов будут иметь TTL в течение 1 часа
     */
    media?: string;
    /**
     * Координаты местоположения
     */
    location?: {
        /**
         * Координата lat
         */
        lat: number;
        /**
         * Координата lon
         */
        lon: number;
    }
    /**
     * Имя пользователя контакта, phone_number - номер телефона контакта и avatar в качестве URL Аватара
     */
    contact?: {
        name: string;
        phone_number: string;
        avatar: string;
    }
    /**
     * Отслеживание данных, отправленных вместе с последним сообщением пользователю
     */
    tracking_data?: string;
    /**
     * Имя файла. Актуально для type='file'
     */
    file_name?: string;
    /**
     * Размер файла в байтах. Актуально для type='file'
     */
    file_size?: number;
    /**
     * Длина видео в секундах. Актуально для type='video'
     */
    duration?: number;
    /**
     * Viber наклейка id. Актуально для type='sticker'
     */
    sticker_id?: number;
}

export interface IViberContent {
    /**
     * Callback type - какое событие вызвало обратный вызов
     */
    event: string;
    /**
     * Время события, которое вызвало обратный вызов
     */
    timestamp?: number;
    /**
     * Уникальный идентификатор сообщения
     */
    message_token: number;
    /**
     * Информация о пользователе. Для event='message' придет sender, иначе user
     */
    sender?: IViberUser;
    /**
     * Информация о пользователе. Для event='message' придет sender, иначе user
     */
    user?: IViberUser;
    /**
     * Информация о сообщении
     */
    message?: IViberMessage;
}
