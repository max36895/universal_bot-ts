import {Button} from "../Button";

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

    /**
     * Получение массива с кнопками для ответа пользователю.
     *
     * @return any
     */
    public abstract getButtons(): any;
}
