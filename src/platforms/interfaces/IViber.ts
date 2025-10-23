/**
 * Интерфейсы для работы с Viber
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
