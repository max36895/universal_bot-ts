/**
 * Интерфейсы для работы с Telegram
 * Определяют структуру данных для взаимодействия с Telegram Bot API
 *
 * Основные компоненты:
 * - Сообщения (ITelegramMessage)
 * - Отправители (ITelegramMessageFrom)
 * - Чаты (ITelegramMessageChat)
 * - Обновления (ITelegramContent)
 *
 * @module platforms/interfaces/ITelegram
 */

/**
 * Информация об отправителе сообщения
 */
export interface ITelegramMessageFrom {
    /** ID пользователя */
    id: number;
    /** Является ли ботом */
    is_bot: boolean;
    /** Имя */
    first_name?: string;
    /** Фамилия */
    last_name?: string;
    /** Имя пользователя */
    username?: string;
    /** Код языка */
    language_code?: string;
}

/**
 * Информация о чате
 */
export interface ITelegramMessageChat {
    /** ID чата */
    id: number;
    /** Имя */
    first_name?: string;
    /** Фамилия */
    last_name?: string;
    /** Имя пользователя */
    username?: string;
    /** Тип чата */
    type?: string;
}

/**
 * Сообщение Telegram
 */
export interface ITelegramMessage {
    /** ID сообщения */
    message_id: number;
    /** Информация об отправителе */
    from?: ITelegramMessageFrom;
    /** Информация о чате */
    chat: ITelegramMessageChat;
    /** Дата отправки */
    date?: number;
    /** Текст сообщения */
    text: string;
}

/**
 * Обновление от Telegram
 * Содержит различные типы входящих данных
 */
export interface ITelegramContent {
    /** ID обновления */
    update_id?: number;
    /** Входящее сообщение */
    message: ITelegramMessage;
    /**
     * Отредактированное сообщение
     * Содержит новую версию сообщения после редактирования
     * @see ITelegramMessage
     */
    edited_message?: any;
    /**
     * Пост в канале
     * Новое сообщение в канале (текст, фото, стикер и т.д.)
     * @see ITelegramMessage
     */
    channel_post?: any;
    /**
     * Отредактированный пост в канале
     * Новая версия поста после редактирования
     * @see ITelegramMessage
     */
    edited_channel_post?: any;
    /**
     * Встроенный запрос
     * Новый запрос для inline-режима
     * @see https://core.telegram.org/bots/api#inlinequery
     */
    inline_query?: any;
    /**
     * Результат встроенного запроса
     * Выбранный пользователем результат inline-запроса
     * @see https://core.telegram.org/bots/api#choseninlineresult
     */
    chosen_inline_result?: any;
    /**
     * Запрос обратного вызова
     * Новый запрос от inline-кнопки
     * @see https://core.telegram.org/bots/api#callbackquery
     */
    callback_query?: any;
    /**
     * Запрос доставки
     * Только для счетов с гибкой ценой
     * @see https://core.telegram.org/bots/api#shippingquery
     */
    shipping_query?: any;
    /**
     * Запрос предварительной проверки
     * Содержит информацию о платеже
     * @see https://core.telegram.org/bots/api#precheckoutquery
     */
    pre_checkout_query?: any;
    /**
     * Обновление опроса
     * Бот получает только обновления о своих опросах
     * @see https://core.telegram.org/bots/api#poll
     */
    poll?: any;
    /**
     * Ответ на опрос
     * Обновление о новом голосе в неанонимном опросе
     * @see https://core.telegram.org/bots/api#poll_answer
     */
    poll_answer?: any;
}
