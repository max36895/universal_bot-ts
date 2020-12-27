export interface IViberButton {
    Columns?: number;
    Rows?: number;
    ActionType?: string;
    ActionBody?: string;
    Text: string;
    TextSize?: string;
    TextVAlign?: string;
    TextHAlign?: string;
    Image?: string;
}

export interface IViberButtonObject {
    DefaultHeight: boolean;
    BgColor: string;
    Buttons: IViberButton[];
    Type?: string;
}
