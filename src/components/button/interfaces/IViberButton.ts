/**
 * Интерфейс кнопки IViber
 */
export interface IViberButton {
    /**
     * Количество колонок
     */
    Columns?: number;
    /**
     * Количество столбцов
     */
    Rows?: number;
    /**
     * Тип кнопки
     */
    ActionType?: string;
    /**
     * Тело действия
     */
    ActionBody?: string | null;
    /**
     * Текст
     */
    Text?: string | null;
    /**
     * Размер текста
     */
    TextSize?: string;
    /**
     * Вертикальное выравнивание текста
     */
    TextVAlign?: string;
    /**
     * Горизонтальное выравнивание текста
     */
    TextHAlign?: string;
    /**
     * Ссылка на изображение
     */
    Image?: string;
}

/**
 * Объект кнопки IViber
 */
export interface IViberButtonObject {
    DefaultHeight: boolean;
    BgColor: string;
    Buttons: IViberButton[];
    Type?: string;
}
