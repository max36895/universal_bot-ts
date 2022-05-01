export interface ITelegramMessageFrom {
    id: number;
    is_bot: boolean;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

export interface ITelegramMessageChat {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    type?: string;
}

export interface ITelegramMessage {
    message_id: number;
    from?: ITelegramMessageFrom;
    chat: ITelegramMessageChat;
    date?: number;
    text: string;
}

export interface ITelegramContent {
    update_id?: number;
    message: ITelegramMessage;
    /**
     * Новое входящее сообщение любого вида-текст, фотография, наклейка и т.д. @see message Смотри тут
     */
    edited_message?: any;
    /**
     * Новая версия сообщения, которая известна боту и была отредактирована @see message Смотри тут
     */
    channel_post?: any;
    /**
     * Новый входящий пост канала любого рода-текст, фото, наклейка и т.д. @see message Смотри тут
     */
    edited_channel_post?: any;
    /**
     * Новый входящий встроенный запрос. @see (https://core.telegram.org/bots/api#inlinequery) Смотри тут
     */
    inline_query?: any;
    /**
     * Результат встроенного запроса, который был выбран пользователем и отправлен его партнеру по чату. Пожалуйста, ознакомьтесь с документацией telegram по сбору обратной связи для получения подробной информации о том, как включить эти обновления для бота. @see (https://core.telegram.org/bots/api#choseninlineresult) Смотри тут
     */
    chosen_inline_result?: any;
    /**
     * Новый входящий запрос обратного вызова. @see (https://core.telegram.org/bots/api#callbackquery) Смотри тут
     */
    callback_query?: any;
    /**
     * Новый входящий запрос на доставку. Только для счетов-фактур с гибкой ценой. @see (https://core.telegram.org/bots/api#shippingquery) Смотри тут
     */
    shipping_query?: any;
    /**
     * Новый входящий запрос предварительной проверки. Содержит полную информацию о кассе. @see (https://core.telegram.org/bots/api#precheckoutquery) Смотри тут
     */
    pre_checkout_query?: any;
    /**
     * Новое состояние опроса. Боты получают только обновления о остановленных опросах и опросах, которые отправляются ботом. @see (https://core.telegram.org/bots/api#poll) Смотри тут
     */
    poll?: any;
    /**
     * Пользователь изменил свой ответ в не анонимном опросе. Боты получают новые голоса только в опросах, которые были отправлены самим ботом. @see (https://core.telegram.org/bots/api#poll_answer) Смотри тут
     */
    poll_answer?: any;
}
