import {TButtonPayload} from "../../components/button/interfaces/button";

interface IMarusiaEntities {
    tokens?: {
        start: number;
        end: number;
    }
    type: string;
    value: object;
}

export interface IMarusiaNlu {
    tokens?: string[];
    entities?: IMarusiaEntities[];
    intents?: object;
}

export interface IMarusiaSession {
    'new': boolean;
    message_id: number;
    session_id: string;
    skill_id: string;
    user_id?: string;
}

export interface IMarusiaRequestState {
    session?: Object | string,
    user?: Object | string;
}

export interface IMarusiaRequestMeta {
    locale: string;
    timezone: string;
    client_id: string;
    interfaces: {
        screen?: object;
        payments?: object | null;
        account_linking: object | null;
    };
}

export interface IMarusiaRequest {
    command: string;
    original_utterance: string;
    type: 'SimpleUtterance' | 'ButtonPressed',
    markup?: {
        dangerous_context?: boolean;
    },
    payload?: object;
    nlu?: IMarusiaNlu
}

export interface IMarusiaWebhookRequest {
    meta: IMarusiaRequestMeta;
    request: IMarusiaRequest;
    session: IMarusiaSession;
    account_linking_complete_event?: boolean;
    state?: IMarusiaRequestState;
    version: string;
}

export interface IMarusiaButton {
    title?: string;
    payload?: TButtonPayload;
    url?: string;
    hide?: boolean;
}

export interface IMarusiaButtonCard {
    text?: string;
    payload?: TButtonPayload;
    url?: string;
}

export interface IMarusiaImage {
    image_id?: string;
    title: string;
    description: string;
    button?: IMarusiaButtonCard;
}

export interface IMarusiaBigImage extends IMarusiaImage {
    type: 'BigImage';
}

export interface IMarusiaItemsList {
    type: 'ItemsList';
    header?: {
        text: string
    }
    items?: IMarusiaImage[];
    footer?: {
        text: string;
        button?: IMarusiaButtonCard;
    }
}

export interface IMarusiaResponse {
    text: string;
    tts?: string;
    card?: IMarusiaBigImage | IMarusiaItemsList;
    buttons?: IMarusiaButton[]
    end_session: boolean;
}

export interface IMarusiaSessionResponse {
    session_id: string;
    message_id: number;
    user_id: string;
}

export interface IMarusiaWebhookResponse {
    response?: IMarusiaResponse;
    version: string;
    session?: IMarusiaSessionResponse;
}
