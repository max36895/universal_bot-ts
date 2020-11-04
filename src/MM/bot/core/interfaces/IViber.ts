export interface IViberUser {
    id: string;
    name: string;
    avatar?: string;
    country?: string;
    language?: string;
    api_version: number
}

export interface IViberMessage {
    type: string;
    text: string;
    media?: string;
    location?: {
        lat: number;
        lon: number;
    }
    contact?: {
        name: string;
        phone_number: string;
        avatar: string;
    }
    tracking_data?: string;
    file_name?: string;
    file_size?: number;
    duration?: number;
    sticker_id?: number;
}

export interface IViberContent {
    event: string;
    timestamp?: number;
    message_token: number;
    sender?: IViberUser;
    user?: IViberUser;
    message?: IViberMessage;
}
