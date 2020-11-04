import {IAlisaNlu} from "../../../core/interfaces/IAlisa";

export interface INluResult {
    status: boolean;
    result: string | object;
}

export interface INluThisUser {
    username: string;
    first_name?: string;
    last_name?: string;
}

export interface INluSlot {
    type?: string;

    [name: string]: any;
}

export interface INluIntent {
    slots: INluSlot[] | INluSlot
}

export interface INlu extends IAlisaNlu {
    thisUser?: INluThisUser;
}
