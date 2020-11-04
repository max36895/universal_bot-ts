/**
 * Class TemplateButtonTypes
 * @package bot\components\button\types
 *
 * Шаблонный класс для второстепенных классов.
 * Нужен для отображения кнопок в ответе пользователю.
 */
import {Button} from "../Button";

export abstract class TemplateButtonTypes {
    /**
     * Массив кнопок.
     * @var $buttons Массив кнопок.
     */
    public buttons: Button[];

    /**
     * Получить массив с кнопками для ответа пользователю.
     *
     * @return any
     */
    public abstract getButtons(): any;
}
