export interface IVkMessage {
    date?: number;
    from_id: number;
    id: number;
    out?: number;
    peer_id?: number;
    text: string;
    conversation_message_id?: number;
    fwd_messages?: string[];
    important?: boolean;
    random_id?: number;
    attachments?: any;
    is_hidden?: boolean;
    payload?: any;
}

export interface IVkClientInfo {
    button_actions: string[];
    keyboard: boolean;
    inline_keyboard: boolean;
    lang_id: number;
}

export interface IVkRequestObject {
    message: IVkMessage;
    clientInfo?: IVkClientInfo;
}

export interface IVkRequestContent {
    type: string;
    object?: IVkRequestObject;
    group_id?: string;
    event_id?: string;
    secret?: string;
}
