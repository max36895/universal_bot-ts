export type TButtonPayload = any;

export interface IButton {
    /**
     * Заголовок кнопки
     */
    title?: string;
    /**
     * Текст в кнопке
     */
    text?: string;
    /**
     * Ссылка, по которой перейдет пользователь после нажатия кнопки
     */
    url?: string;
    /**
     * Дополнительные параметры, которые будут переданы после нажатия на кнопку
     */
    payload?: TButtonPayload;
}

export type TButton = string | IButton;
