import { TemplateCardTypes } from './TemplateCardTypes';
import {
    ISberSmartAppCard,
    ISberSmartAppCardItem,
    ISberSmartAppItem,
} from '../../../platforms/interfaces';
import { Buttons } from '../../button';
import { Image } from '../../image/Image';

/**
 * @class SmartAppCard
 * Класс для создания и отображения карточек в Сбер SmartApp.
 * Наследуется от TemplateCardTypes и реализует специфичную для Сбер SmartApp логику.
 *
 * Основные возможности:
 * - Создание карточек с изображениями и текстом
 * - Поддержка различных типов ячеек (image_cell_view, text_cell_view, left_right_cell_view)
 * - Настройка отступов и стилей текста
 * - Добавление кнопок с действиями
 *
 * @example
 * ```typescript
 * const card = new SmartAppCard();
 * card.title = 'Каталог товаров';
 * card.images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
 * ];
 * const result = await card.getCard(false);
 * ```
 */
export class SmartAppCard extends TemplateCardTypes {
    /**
     * Возвращает карточку из 1 элемента
     * @private
     */
    private _getOneElement(image: Image): ISberSmartAppCardItem[] {
        const res: ISberSmartAppCardItem[] = [];
        if (image.imageDir) {
            res.push({
                type: 'image_cell_view',
                content: {
                    url: image.imageDir,
                },
            });
        }
        if (image.title) {
            res.push({
                type: 'text_cell_view',
                paddings: {
                    top: '6x',
                    left: '8x',
                    right: '8x',
                },
                content: {
                    text: image.title,
                    typeface: image.params.titleTypeface || 'title1',
                    text_color: image.params.titleText_color || 'default',
                },
            });
        }
        if (image.desc) {
            res.push({
                type: 'text_cell_view',
                paddings: {
                    top: '4x',
                    left: '8x',
                    right: '8x',
                },
                content: {
                    text: image.desc,
                    typeface: image.params.descTypeface || 'footnote1',
                    text_color: image.params.descText_color || 'secondary',
                },
            });
        }
        const button = image.button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
        if (button) {
            res.push({
                type: 'text_cell_view',
                paddings: {
                    top: '12x',
                    left: '8x',
                    right: '8x',
                },
                content: {
                    actions: [button],
                    text: button.text,
                    typeface: 'button1',
                    text_color: 'brand',
                },
            });
        }
        return res;
    }

    /**
     * Получает элементы для карточки Сбер SmartApp.
     *
     * Процесс работы:
     * 1. Если isOne=true:
     *    - Создает массив элементов для одной карточки
     *    - Добавляет изображение, заголовок, описание и кнопку
     * 2. Иначе:
     *    - Создает элемент left_right_cell_view
     *    - Добавляет иконку, заголовок, описание и кнопку
     *
     * @param {Image} image - Объект с изображением и данными
     * @param {boolean} isOne - Флаг создания элементов для одной карточки
     * @returns {ISberSmartAppCardItem | ISberSmartAppCardItem[]} Элементы карточки
     * @private
     *
     * @example
     * ```typescript
     * const image = new Image('product.jpg', 'Товар', 'Описание');
     *
     * // Получить элементы для одной карточки
     * const singleCardItems = SmartAppCard._getCardItem(image, true);
     * // singleCardItems = [
     * //     {
     * //         type: 'image_cell_view',
     * //         content: { url: 'product.jpg' }
     * //     },
     * //     {
     * //         type: 'text_cell_view',
     * //         content: { text: 'Товар', typeface: 'title1' }
     * //     },
     * //     {
     * //         type: 'text_cell_view',
     * //         content: { text: 'Описание', typeface: 'footnote1' }
     * //     }
     * // ]
     *
     * // Получить элемент для списка
     * const listCardItem = SmartAppCard._getCardItem(image, false);
     * // listCardItem = {
     * //     type: 'left_right_cell_view',
     * //     left: {
     * //         type: 'fast_answer_left_view',
     * //         label: { text: 'Товар', typeface: 'headline2' },
     * //         icon_and_value: {
     * //             value: { text: 'Описание', typeface: 'body3' }
     * //         }
     * //     }
     * // }
     * ```
     */
    protected _getCardItem(
        image: Image,
        isOne: boolean = false,
    ): ISberSmartAppCardItem | ISberSmartAppCardItem[] {
        if (isOne) {
            return this._getOneElement(image);
        }
        const cardItem: ISberSmartAppCardItem = {
            type: 'left_right_cell_view',
            paddings: {
                left: '4x',
                top: '4x',
                right: '4x',
                bottom: '4x',
            },
            left: {
                type: 'fast_answer_left_view',
                icon_vertical_gravity: 'top',
                icon_and_value: {
                    value: {
                        text: image.desc,
                        typeface: image.params.descTypeface || 'body3',
                        text_color: image.params.descText_color || 'default',
                        max_lines: image.params.descMax_lines || 0,
                    },
                },
                label: {
                    text: image.title,
                    typeface: image.params.titleTypeface || 'headline2',
                    text_color: image.params.titleText_color || 'default',
                    max_lines: image.params.titleMax_lines || 0,
                },
            },
        };
        if (image.imageDir) {
            (cardItem as Required<ISberSmartAppCardItem>).left.icon_and_value.icon = {
                address: {
                    type: 'url',
                    url: image.imageDir,
                },
                size: {
                    width: 'xlarge',
                    height: 'xlarge',
                },
                margin: {
                    left: '0x',
                    right: '6x',
                },
            };
        }
        const button = image.button.getButtons(Buttons.T_SMARTAPP_BUTTON_CARD);
        if (button) {
            if (!cardItem.bottom_text) {
                cardItem.bottom_text = {
                    text: image.title,
                    typeface: image.params.descTypeface || 'body3',
                    text_color: image.params.descText_color || 'default',
                };
            }
            cardItem.bottom_text.actions = button;
        }
        return cardItem;
    }

    /**
     * Получает карточку для отображения в Сбер SmartApp.
     *
     * Процесс работы:
     * 1. Если isOne=true:
     *    - Создает карточку типа list_card
     *    - Добавляет элементы для одного изображения
     * 2. Иначе:
     *    - Создает карточку типа list_card
     *    - Добавляет заголовок (если есть)
     *    - Добавляет элементы для каждого изображения
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<ISberSmartAppItem | null>} Карточка или null
     *
     * @example
     * ```typescript
     * const card = new SmartAppCard();
     * card.title = 'Каталог товаров';
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     *
     * // Получить одну карточку
     * const singleCard = await card.getCard(true);
     * // singleCard = {
     * //     card: {
     * //         type: 'list_card',
     * //         cells: [
     * //             { type: 'image_cell_view', content: { url: 'product1.jpg' } },
     * //             { type: 'text_cell_view', content: { text: 'Товар 1' } },
     * //             { type: 'text_cell_view', content: { text: 'Описание 1' } }
     * //         ]
     * //     }
     * // }
     *
     * // Получить список
     * const listCard = await card.getCard(false);
     * // listCard = {
     * //     card: {
     * //         type: 'list_card',
     * //         cells: [
     * //             { type: 'text_cell_view', content: { text: 'Каталог товаров' } },
     * //             { type: 'left_right_cell_view', left: { ... } },
     * //             { type: 'left_right_cell_view', left: { ... } }
     * //         ]
     * //     }
     * // }
     * ```
     */
    public async getCard(isOne: boolean): Promise<ISberSmartAppItem | null> {
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                const card: ISberSmartAppCard = {
                    type: 'list_card',
                };
                card.cells = this._getCardItem(this.images[0], true) as ISberSmartAppCardItem[];
                return { card };
            } else {
                const card: ISberSmartAppCard = {
                    type: 'list_card',
                    cells: [],
                };
                if (this.title) {
                    (card as Required<ISberSmartAppCard>).cells.push({
                        type: 'text_cell_view',
                        paddings: {
                            top: '4x',
                            left: '2x',
                            right: '2x',
                        },
                        content: {
                            text: this.title,
                            typeface: 'title1',
                            text_color: 'default',
                        },
                    });
                }
                this.images.forEach((image) => {
                    (card as Required<ISberSmartAppCard>).cells.push(
                        this._getCardItem(image) as ISberSmartAppCardItem,
                    );
                });
                return { card };
            }
        }
        return null;
    }
}
