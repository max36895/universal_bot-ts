export interface IVkButtonObject {
    one_time: boolean;
    buttons: IVkButton[] | IVkButton[][] | any;
}

export interface IVkButtonAction {
    type?: string;
    link?: string;
    label?: string;
    payload?: string;
}

export interface IVkButton {
    action?: IVkButtonAction;
    color?: string;
    hash?: string;
    payload?: any;
}
