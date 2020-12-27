export type TButtonPayload = any;

export interface IButtonOptions {
    /**
     * Задается в том случае, если нужно объеденить кнопку в группу.
     */
    _group?: string | number;

    /**
     * Дополнительные опции для кнопки.
     */
    [name: string]: any;
}

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
    /**
     * Дополнительные параметры для кнопки, которые повлияют на ее отображение
     */
    options?: IButtonOptions;
}

export type TButton = string | IButton;
