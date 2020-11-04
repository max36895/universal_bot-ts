import {IViberButton, IViberButtonObject} from "../../components/button/interfaces/IViberButton";

export interface IViberUserInfo {
    id: string;
    name?: string;
    avatar: string;
    country?: string;
    language?: string;
    primary_device_os: string;
    api_version: number;
    viber_version: string;
    mss?: number;
    mnc?: number;
    device_type: string;
}

export interface IViberSender {
    name: string;
    avatar: string;
}

export interface IViberGetUserDetails {
    status: number;
    status_message: string;
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
    receiver?: string;
    type?: string;
    sender?: string;
    tracking_data?: string;
    min_api_version?: string;
    text?: string;
    media?: string;
    thumbnail?: string;
    size?: number;
    duration?: number;
    file_name?: string;
    contact?: {
        name: string;
        phone_number: string;
    }
    location?: {
        lat: string;
        lon: string;
    }
    sticker_id?: number;
    keyboard?:IViberButtonObject;
}
