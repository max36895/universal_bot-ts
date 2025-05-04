import { TemplateCardTypes } from './TemplateCardTypes';
import { Buttons, IViberButton, IViberButtonObject } from '../../button';
import { Image } from '../../image/Image';

/**
 * @interface IViberCard
 * Интерфейс для карточки в Viber.
 * Расширяет интерфейс IViberButton, добавляя специфичные для Viber свойства.
 *
 * Особенности:
 * - Поддерживает форматированный текст (HTML)
 * - Позволяет настраивать размеры карточки (Columns и Rows от 1 до 6)
 * - Может содержать изображения и кнопки
 * - Поддерживает различные стили текста
 * - Требует обязательные поля ActionType и ActionBody
 *
 * @example
 * ```typescript
 * // Создание простой карточки
 * const card: IViberCard = {
 *     Columns: 6, // Максимальная ширина
 *     Rows: 6,    // Максимальная высота
 *     Image: 'https://example.com/image.jpg',
 *     Text: '<font color=#000><b>Заголовок</b></font><br><font color=#666>Описание</font>',
 *     ActionType: 'reply',  // Обязательное поле
 *     ActionBody: 'card_action'  // Обязательное поле
 * };
 *
 * // Создание карточки с кнопкой
 * const cardWithButton: IViberCard = {
 *     Columns: 6,
 *     Rows: 6,
 *     Image: 'https://example.com/image.jpg',
 *     Text: '<font color=#000><b>Заголовок</b></font><br><font color=#666>Описание</font>',
 *     ActionType: 'reply',
 *     ActionBody: 'button_action',
 *     Buttons: [{
 *         Columns: 6,
 *         Rows: 1,
 *         Text: '<font color=#fff>Нажми меня</font>',
 *         ActionType: 'reply',
 *         ActionBody: 'button_click'
 *     }]
 * };
 * ```
 */
export interface IViberCard extends IViberButton {}

/**
 * @class ViberCard
 * Класс для создания и отображения карточек в Viber.
 * Наследуется от TemplateCardTypes и реализует специфичную для Viber логику.
 *
 * Основные возможности:
 * - Создание карточек с изображениями и текстом
 * - Поддержка форматированного текста (HTML)
 * - Ограничение количества изображений (максимум 7)
 * - Адаптация размеров карточки под количество изображений
 * - Поддержка различных типов кнопок
 * - Автоматическое форматирование текста
 * - Поддержка цветов и стилей текста
 *
 * @example
 * ```typescript
 * // Создание карточки с одним изображением
 * const card = new ViberCard();
 * const image = new Image();
 * image.init('product1.jpg', 'Товар 1', 'Описание 1');
 * image.button.addBtn('Купить', 'buy_action');
 * card.images = [image];
 * const result = await card.getCard(true);
 * // result = {
 * //     Columns: 6,
 * //     Rows: 6,
 * //     Image: 'product1.jpg',
 * //     Text: '<font color=#000><b>Товар 1</b></font><br><font color=#666>Описание 1</font>',
 * //     ActionType: 'reply',
 * //     ActionBody: 'buy_action',
 * //     Buttons: [{
 * //         Columns: 6,
 * //         Rows: 1,
 * //         Text: '<font color=#fff>Купить</font>',
 * //         ActionType: 'reply',
 * //         ActionBody: 'buy_action'
 * //     }]
 * // }
 *
 * // Создание карточки с несколькими изображениями
 * const multipleCard = new ViberCard();
 * const images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2'),
 *     new Image('product3.jpg', 'Товар 3', 'Описание 3')
 * ];
 * multipleCard.images = images;
 * const result = await multipleCard.getCard(false);
 * // result = [
 * //     {
 * //         Columns: 6,
 * //         Rows: 6,
 * //         Image: 'product1.jpg',
 * //         Text: '<font color=#000><b>Товар 1</b></font><br><font color=#666>Описание 1</font>',
 * //         ActionType: 'reply',
 * //         ActionBody: 'card_action'
 * //     },
 * //     {
 * //         Columns: 6,
 * //         Rows: 6,
 * //         Image: 'product2.jpg',
 * //         Text: '<font color=#000><b>Товар 2</b></font><br><font color=#666>Описание 2</font>',
 * //         ActionType: 'reply',
 * //         ActionBody: 'card_action'
 * //     },
 * //     {
 * //         Columns: 6,
 * //         Rows: 6,
 * //         Image: 'product3.jpg',
 * //         Text: '<font color=#000><b>Товар 3</b></font><br><font color=#666>Описание 3</font>',
 * //         ActionType: 'reply',
 * //         ActionBody: 'card_action'
 * //     }
 * // ]
 * ```
 */
export class ViberCard extends TemplateCardTypes {
    /**
     * Создает элемент карточки для Viber из объекта изображения.
     *
     * Процесс работы:
     * 1. Проверяет наличие токена изображения:
     *    - Если нет токена, использует путь к изображению
     * 2. Создает базовую структуру карточки:
     *    - Устанавливает количество колонок (от 1 до 6)
     *    - Устанавливает количество строк (от 1 до 6)
     * 3. Добавляет изображение, если оно есть:
     *    - Использует токен или путь к изображению
     * 4. Добавляет кнопки и форматированный текст:
     *    - Форматирует заголовок жирным шрифтом
     *    - Добавляет описание с правильным цветом
     *    - Применяет стили и цвета
     *
     * @param {Image} image - Объект с изображением
     * @param {number} [countImage=1] - Количество изображений в карточке
     * @returns {IViberCard} Элемент карточки для Viber
     * @private
     *
     * @example
     * ```typescript
     * // Создание элемента с одним изображением
     * const image = new Image();
     * image.init('product.jpg', 'Товар', 'Описание');
     * const element = ViberCard._getElement(image);
     * // element = {
     * //     Columns: 6,
     * //     Rows: 6,
     * //     Image: 'product.jpg',
     * //     Text: '<font color=#000><b>Товар</b></font><br><font color=#666>Описание</font>',
     * //     ActionType: 'reply',
     * //     ActionBody: 'card_action'
     * // }
     *
     * // Создание элемента с кнопкой
     * const imageWithButton = new Image();
     * imageWithButton.init('product.jpg', 'Товар', 'Описание');
     * imageWithButton.button.addBtn('Купить', 'buy_action');
     * const elementWithButton = ViberCard._getElement(imageWithButton);
     * // elementWithButton = {
     * //     Columns: 6,
     * //     Rows: 6,
     * //     Image: 'product.jpg',
     * //     Text: '<font color=#000><b>Товар</b></font><br><font color=#666>Описание</font>',
     * //     ActionType: 'reply',
     * //     ActionBody: 'buy_action',
     * //     Buttons: [{
     * //         Columns: 6,
     * //         Rows: 1,
     * //         Text: '<font color=#fff>Купить</font>',
     * //         ActionType: 'reply',
     * //         ActionBody: 'buy_action'
     * //     }]
     * // }
     * ```
     */
    protected static _getElement(image: Image, countImage: number = 1): IViberCard {
        if (!image.imageToken) {
            if (image.imageDir) {
                image.imageToken = image.imageDir;
            }
        }

        let element: IViberCard = {
            Columns: countImage,
            Rows: 6,
        };
        if (image.imageToken) {
            element.Image = image.imageToken;
        }
        const btn: IViberButtonObject | null = image.button.getButtons<IViberButtonObject>(
            Buttons.T_VIBER_BUTTONS,
        );
        if (btn && typeof btn.Buttons !== 'undefined') {
            element = { ...element, ...btn.Buttons[0] };
            element.Text = `<font color=#000><b>${image.title}</b></font><font color=#000>${image.desc}</font>`;
        }
        return element;
    }

    /**
     * Получает карточку для отображения в Viber.
     *
     * Процесс работы:
     * 1. Проверяет количество изображений:
     *    - Ограничивает до 7 изображений
     * 2. Если isOne=true или одно изображение:
     *    - Создает одну карточку
     *    - Возвращает объект IViberCard
     * 3. Иначе:
     *    - Создает массив карточек
     *    - Добавляет карточку для каждого изображения
     *    - Возвращает массив IViberCard[]
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<IViberCard[] | IViberCard>} Карточка или массив карточек
     *
     * @example
     * ```typescript
     * const card = new ViberCard();
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     *
     * // Получить одну карточку
     * const singleCard = await card.getCard(true);
     * // singleCard = {
     * //     Columns: 6,
     * //     Rows: 6,
     * //     Image: 'product1.jpg',
     * //     Text: '<font color=#000><b>Товар 1</b></font><br><font color=#666>Описание 1</font>',
     * //     ActionType: 'reply',
     * //     ActionBody: 'card_action'
     * // }
     *
     * // Получить массив карточек
     * const multipleCards = await card.getCard(false);
     * // multipleCards = [
     * //     {
     * //         Columns: 6,
     * //         Rows: 6,
     * //         Image: 'product1.jpg',
     * //         Text: '<font color=#000><b>Товар 1</b></font><br><font color=#666>Описание 1</font>',
     * //         ActionType: 'reply',
     * //         ActionBody: 'card_action'
     * //     },
     * //     {
     * //         Columns: 6,
     * //         Rows: 6,
     * //         Image: 'product2.jpg',
     * //         Text: '<font color=#000><b>Товар 2</b></font><br><font color=#666>Описание 2</font>',
     * //         ActionType: 'reply',
     * //         ActionBody: 'card_action'
     * //     }
     * // ]
     * ```
     */
    public async getCard(isOne: boolean): Promise<IViberCard[] | IViberCard> {
        const objects: IViberCard[] = [];
        let countImage = this.images.length;
        if (countImage > 7) {
            countImage = 7;
        }
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        this.images[0].imageToken = this.images[0].imageDir;
                    }
                }
                if (this.images[0].imageToken) {
                    return ViberCard._getElement(this.images[0]);
                }
            } else {
                this.images.forEach((image) => {
                    if (objects.length <= countImage) {
                        objects.push(ViberCard._getElement(image, countImage));
                    }
                });
            }
        }
        return objects;
    }
}
