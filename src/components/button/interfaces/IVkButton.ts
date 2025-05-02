/**
 * Интерфейс объекта кнопки VK.
 * @interface
 */
export interface IVkButtonObject {
    /**
     * Определяет, будет ли кнопка отображаться только один раз.
     * @type {boolean}
     */
    one_time: boolean;

    /**
     * Массив кнопок или массив массивов кнопок.
     * @type {IVkButton[] | IVkButton[][] | any}
     */
    buttons: IVkButton[] | IVkButton[][] | any;
}

/**
 * Интерфейс действия кнопки VK.
 * @interface
 */
export interface IVkButtonAction {
    /**
     * Тип действия.
     * @type {string}
     */
    type?: string;

    /**
     * Ссылка для действия.
     * @type {string}
     */
    link?: string;

    /**
     * Метка для действия.
     * @type {string | null}
     */
    label?: string | null;

    /**
     * Полезная нагрузка для действия.
     * @type {string | object}
     */
    payload?: string | object;
}

/**
 * Интерфейс кнопки VK.
 * @interface
 */
export interface IVkButton {
    /**
     * Действие кнопки.
     * @type {IVkButtonAction}
     */
    action: IVkButtonAction;

    /**
     * Цвет кнопки.
     * @type {string}
     */
    color?: string;

    /**
     * Хеш кнопки.
     * @type {string}
     */
    hash?: string;

    /**
     * Полезная нагрузка кнопки.
     * @type {any}
     */
    payload?: any;

    /**
     * Группа кнопки.
     * @type {any}
     */
    _group?: any;
}
