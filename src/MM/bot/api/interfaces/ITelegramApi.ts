export type TTelegramQuestionType = 'quiz' | 'regular';
export type TTelegramChatId = string | number;

export interface ITelegramParams {
    chat_id?: TTelegramChatId;
    text?: string;
    parse_mode?: string;
    disable_web_page_preview?: boolean;
    disable_notification?: boolean;
    reply_to_message_id?: number;
    reply_markup?: string;

    // question
    question?: string;
    options?: any;
    is_anonymous?: boolean;
    type?: TTelegramQuestionType;
    allows_multiple_answers?: boolean;
    correct_option_id?: number;
    is_closed?: boolean;

    // photo
    photo?: string;
    caption?: string;

    // document
    document?: string;
    thumb?: string;

    // audio
    audio?: string;
    duration?: number;
    performer?: string;
    title?: string;

    // video
    video?: string;
    supports_streaming?: boolean;
}

export interface ITelegramFrom {
    id: number;
    is_bot: boolean;
    first_name: string;
    username: string;
}

export interface ITelegramChat {
    id: number;
    first_name: string;
    last_name: string;
    username: string;
    type: string;
}

export interface ITelegramPoll {
    id: number;
    question: string;
    options: [{
        text: string;
        voter_count: number;
    }];
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: TTelegramQuestionType;
    allows_multiple_answers: boolean;
    correct_option_id: number;
}

export interface ITelegramPhoto {
    file_id: string;
    file_unique_id: string;
    file_size: number;
    width: number;
    height: number;
}

export interface ITelegramThumb {
    file_id: string;
    file_unique_id: string;
    file_size: number;
    width?: number;
    height?: number;
}

export interface ITelegramDocument {
    file_name: string;
    mime_type: string;
    thumb: ITelegramThumb;
    file_id: string;
    file_unique_id: string;
    file_size: number;
}

export interface ITelegramAudio {
    name: string;
    mime_type: string;
    duration: number;
    performer: string;
    thumb: ITelegramThumb;
    file_id: string;
    file_unique_id: string;
    file_size: number;
}

export interface ITelegramVideo extends ITelegramAudio {
    width: number;
    height: number;
}

export interface ITelegramResultContent {
    message_id: number;
    from: ITelegramFrom;
    chat?: ITelegramChat
    date?: number;
    text?: string;
    poll?: ITelegramPoll;
    photo?: ITelegramPhoto;
    document?: ITelegramDocument;
    audio?: ITelegramAudio;
    video?: ITelegramVideo;
}

export interface ITelegramResult {
    ok: boolean;
    result?: ITelegramResultContent;
    error_code?: number;
    description?: string;
}

