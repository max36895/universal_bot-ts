export type TButtonPayload = any;

export interface IButton {
    title?: string;
    text?: string;
    url?: string;
    payload?: TButtonPayload;
}

export type TButton = string | IButton;
