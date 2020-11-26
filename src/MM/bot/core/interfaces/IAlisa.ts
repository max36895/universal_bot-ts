import {TButtonPayload} from "../../components/button/interfaces/button";

interface IAlisaEntities {
    tokens?: {
        start: number;
        end: number;
    }
    type: string;
    value: object;
}

export interface IAlisaNlu {
    tokens?: string[];
    entities?: IAlisaEntities[];
    intents?: object;
}

export interface IAlisaSession {
    'new': boolean;
    message_id: number;
    session_id: string;
    skill_id: string;
    user_id?: string;
    user?: {
        user_id: string;
        access_token: string
    }
    application?: {
        application_id: string;
    }
}

export interface IAlisaRequestState {
    session?: Object | string,
    user?: Object | string;
}

export interface IAlisaRequestMeta {
    locale: string;
    timezone: string;
    client_id: string;
    interfaces: {
        screen?: object;
        payments?: object | null;
        account_linking: object | null;
    };
}

export interface IAlisaRequest {
    command: string;
    original_utterance: string;
    type: 'SimpleUtterance' | 'ButtonPressed',
    markup?: {
        dangerous_context?: boolean;
    },
    payload?: object;
    nlu?: IAlisaNlu
}

export interface IAlisaWebhookRequest {
    meta: IAlisaRequestMeta;
    request: IAlisaRequest;
    session: IAlisaSession;
    account_linking_complete_event?: boolean;
    state?: IAlisaRequestState;
    version: string;
}

export interface IAlisaButton {
    title?: string;
    payload?: TButtonPayload;
    url?: string;
    hide?: boolean;
}

export interface IAlisaButtonCard {
    text?: string;
    payload?: TButtonPayload;
    url?: string;
}

export interface IAlisaImage {
    image_id?: string;
    title: string;
    description: string;
    button?: IAlisaButtonCard;
}

export interface IAlisaBigImage extends IAlisaImage {
    type: 'BigImage';
}

export interface IAlisaItemsList {
    type: 'ItemsList';
    header?: {
        text: string
    }
    items?: IAlisaImage[];
    footer?: {
        text: string;
        button?: IAlisaButtonCard;
    }
}

export interface IAlisaResponse {
    text: string;
    tts?: string;
    card?: IAlisaBigImage | IAlisaItemsList;
    buttons?: IAlisaButton[]
    end_session: boolean;
}

export interface IAlisaWebhookResponse {
    response?: IAlisaResponse;
    session_state?: object;
    user_state_update?: object;
    version: string;
    start_account_linking?: any;
}
