export interface IViberButton {
    /**
     * Количество колонок
     */
    Columns?: number;
    /**
     * Количество столбцов
     */
    Rows?: number;
    ActionType?: string;
    ActionBody?: string | null;
    /**
     * Текст
     */
    Text?: string | null;
    TextSize?: string;
    TextVAlign?: string;
    TextHAlign?: string;
    /**
     * Ссылка на изображение
     */
    Image?: string;
}

export interface IViberButtonObject {
    DefaultHeight: boolean;
    BgColor: string;
    Buttons: IViberButton[];
    Type?: string;
}
