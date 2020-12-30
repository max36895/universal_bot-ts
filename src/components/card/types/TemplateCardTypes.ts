import {Image} from "../../image/Image";
import {Buttons} from "../../button";

/**
 * @class TemplateCardTypes
 *
 * Шаблонный класс для карточек.
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
     * Использование галереи изображений.
     * @type {boolean}
     */
    public isUsedGallery: boolean = false;

    /**
     * Получение карточки для отображения пользователю.
     *
     * @param {boolean} isOne True, если в любом случае отобразить 1 элемент карточки
     * @return any
     */
    public abstract getCard(isOne: boolean): any;
}
