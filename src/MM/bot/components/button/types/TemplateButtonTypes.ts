import {Button} from "../Button";

/**
 * Class TemplateButtonTypes
 * @class bot\components\button\types
 *
 * Шаблонный класс для второстепенных классов.
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
