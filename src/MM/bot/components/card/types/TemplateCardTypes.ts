import {Image} from "../../image/Image";
import {Buttons} from "../../button/Buttons";

/**
 * Class TemplateCardTypes
 * @class bot\components\card\types
 *
 * Шаблонный класс для второстепенных классов.
 * Нужен для отображения карточек в ответе пользователю.
 */
export abstract class TemplateCardTypes {
    /**
     * Массив изображений или элементов для карточки.
     */
    public images: Image[];
    /**
     * Кнопка для карточки.
     * @see Buttons Смотри тут
     */
    public button: Buttons;
    /**
     * Заголовок для карточки.
     */
    public title: string;

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае использовать 1 картинку.
     * @return any
     */
    public abstract getCard(isOne: boolean): any;
}
