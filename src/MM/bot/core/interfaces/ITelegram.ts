export interface ITelegramMessage {
    message_id: number;
    from?: {
        id: number;
        is_bot: boolean;
        first_name?: string;
        last_name?: string;
        username?: string;
        language_code?: string;
    }
    chat?: {
        id: number;
        first_name?: string;
        last_name?: string;
        username?: string;
        type?: string;
    }
    date?: number;
    text?: string;
}

export interface ITelegramContent {
    update_id?: number;
    message: ITelegramMessage;
    edited_message?: any;
    channel_post?: any;
    edited_channel_post?: any;
    inline_query?: any;
    chosen_inline_result?: any;
    callback_query?: any;
    shipping_query?: any;
    pre_checkout_query?: any;
    poll?: any
    poll_answer?: any;
}
