import { Image } from '../../image/Image';
import { Buttons } from '../../button';

/**
 * @class TemplateCardTypes
 * Абстрактный класс, определяющий базовую структуру для карточек на различных платформах.
 *
 * Этот класс служит шаблоном для создания платформо-специфичных карточек.
 * Каждая платформа (Алиса, VK, Telegram и т.д.) должна реализовать свой класс,
 * наследующийся от TemplateCardTypes и переопределяющий метод getCard.
 *
 * @example
 * ```typescript
 * // Пример реализации карточки для новой платформы
 * class CustomCard extends TemplateCardTypes {
 *     public async getCard(isOne: boolean): Promise<any> {
 *         // Реализация отображения карточки для конкретной платформы
 *         return {
 *             type: 'custom_card',
 *             title: this.title,
 *             images: this.images,
 *             buttons: this.button.getButtons()
 *         };
 *     }
 * }
 * ```
 */
export abstract class TemplateCardTypes {
    /**
     * Массив изображений или элементов для карточки.
     * Каждый элемент может содержать изображение, заголовок, описание и кнопки.
     * @type {Image[]}
     * @see Image
     * @example
     * ```typescript
     * this.images = [
     *     new Image('image1.jpg', 'Заголовок 1', 'Описание 1'),
     *     new Image('image2.jpg', 'Заголовок 2', 'Описание 2')
     * ];
     * ```
     */
    public images: Image[];

    /**
     * Кнопки для карточки.
     * Используются для взаимодействия с пользователем.
     * @type {Buttons}
     * @see Buttons
     * @example
     * ```typescript
     * this.button.addBtn('Купить');
     * this.button.addLink('Подробнее', 'https://example.com');
     * ```
     */
    public button: Buttons;

    /**
     * Заголовок карточки.
     * Отображается в верхней части карточки.
     * @type {string | null}
     * @example
     * ```typescript
     * this.title = 'Название товара';
     * ```
     */
    public title: string | null;

    /**
     * Флаг использования галереи изображений.
     * true - изображения отображаются в виде галереи
     * false - изображения отображаются как отдельные карточки
     * @type {boolean}
     * @example
     * ```typescript
     * this.isUsedGallery = true; // Включить режим галереи
     * ```
     */
    public isUsedGallery: boolean = false;

    /**
     * Создает новый экземпляр карточки.
     * Инициализирует все поля значениями по умолчанию.
     * @example
     * ```typescript
     * const card = new CustomCard();
     * ```
     */
    constructor() {
        this.title = null;
        this.images = [];
        this.button = new Buttons();
    }

    /**
     * Абстрактный метод для получения данных карточки.
     * Должен быть реализован в каждом платформо-специфичном классе.
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<any>} Данные карточки в формате, специфичном для платформы
     * @abstract
     * @example
     * ```typescript
     * // Пример реализации для конкретной платформы
     * public async getCard(isOne: boolean): Promise<any> {
     *     if (isOne && this.images.length > 0) {
     *         return this.formatSingleCard(this.images[0]);
     *     }
     *     return this.formatMultipleCards(this.images);
     * }
     * ```
     */
    public abstract getCard(isOne: boolean): Promise<any>;
}
