/**
 * Интерфейсы для работы с VK
 * Определяют структуру данных для взаимодействия с VK Bot API
 *
 * Основные компоненты:
 * - Сообщения (IVkMessage)
 * - Информация о клиенте (IVkClientInfo)
 * - Объекты запросов (IVkRequestObject)
 * - Обновления (IVkRequestContent)
 *
 * @module platforms/interfaces/IVk
 */

/**
 * Сообщение VK
 * Содержит информацию о входящем или исходящем сообщении
 */
export interface IVkMessage {
    /** Дата отправки сообщения в формате Unix timestamp */
    date?: number;
    /** ID отправителя сообщения */
    from_id: number;
    /** ID сообщения */
    id: number;
    /**
     * Тип сообщения
     * 0 - входящее
     * 1 - исходящее
     */
    out?: number;
    /** ID беседы или пользователя */
    peer_id?: number;
    /** Текст сообщения */
    text: string;
    /** ID сообщения в беседе */
    conversation_message_id?: number;
    /** Массив пересланных сообщений */
    fwd_messages?: string[];
    /** Является ли сообщение важным */
    important?: boolean;
    /** Уникальный идентификатор сообщения */
    random_id?: number;
    /** Вложения (фото, видео, документы и т.д.) */
    attachments?: any;
    /** Скрыто ли сообщение */
    is_hidden?: boolean;
    /** Дополнительные данные */
    payload?: any;
}

/**
 * Информация о клиенте
 * Содержит данные о возможностях клиента
 */
export interface IVkClientInfo {
    /** Поддерживаемые действия с кнопками */
    button_actions: string[];
    /** Поддерживает ли клиент клавиатуру */
    keyboard: boolean;
    /** Поддерживает ли клиент inline-клавиатуру */
    inline_keyboard: boolean;
    /** ID языка клиента */
    lang_id: number;
}

/**
 * Объект запроса VK
 * Содержит информацию о сообщении и клиенте
 */
export interface IVkRequestObject {
    /** Информация о сообщении */
    message: IVkMessage;
    /** Информация о клиенте */
    clientInfo?: IVkClientInfo;
}

/**
 * Обновление от VK
 * Содержит информацию о типе события и связанных данных
 */
export interface IVkRequestContent {
    /** Тип события (message_new, message_event и т.д.) */
    type: string;
    /** Объект запроса с данными */
    object?: IVkRequestObject;
    /** ID группы */
    group_id?: string;
    /** ID события */
    event_id?: string;
    /** Секретный ключ для проверки подписи */
    secret?: string;
}
