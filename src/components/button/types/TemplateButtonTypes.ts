import { Button } from '../Button';

/**
 * @class TemplateButtonTypes
 *
 * Шаблонный класс для кнопок.
 * Нужен для отображения кнопок в ответе пользователю.
 */
export abstract class TemplateButtonTypes {
    /**
     * Массив кнопок.
     */
    public buttons: Button[];

    public constructor() {
        this.buttons = [];
    }

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return any
     * @virtual
     */
    public abstract getButtons(): any;
}
