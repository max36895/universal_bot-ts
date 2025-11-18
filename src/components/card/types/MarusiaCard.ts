import { TemplateCardTypes } from './TemplateCardTypes';
import { Buttons } from '../../button';
import { ImageTokens } from '../../../models/ImageTokens';
import { Text } from '../../../utils/standard/Text';
import {
    IMarusiaBigImage,
    IMarusiaButtonCard,
    IMarusiaImage,
    IMarusiaItemsList,
} from '../../../platforms/interfaces';

/**
 * @class MarusiaCard
 * Класс для создания и отображения карточек в Марусе.
 * Наследуется от TemplateCardTypes и реализует специфичную для Маруси логику.
 *
 * Основные возможности:
 * - Создание больших изображений с описанием
 * - Создание списков элементов
 * - Поддержка кнопок для каждого элемента
 * - Автоматическое ограничение длины текста
 *
 * @example
 * ```typescript
 * const card = new MarusiaCard();
 * card.title = 'Каталог товаров';
 * card.images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
 * ];
 * const result = await card.getCard(false);
 * ```
 */
export class MarusiaCard extends TemplateCardTypes {
    /**
     * Определяет тип карточки как большое изображение.
     * Используется для отображения одного изображения с описанием.
     * @type {string}
     * @example
     * ```typescript
     * const card = new MarusiaCard();
     * card.type = MarusiaCard.MARUSIA_CARD_BIG_IMAGE;
     * ```
     */
    public static readonly MARUSIA_CARD_BIG_IMAGE = 'BigImage';

    /**
     * Определяет тип карточки как список элементов.
     * Используется для отображения нескольких элементов с изображениями.
     * @type {string}
     * @example
     * ```typescript
     * const card = new MarusiaCard();
     * card.type = MarusiaCard.MARUSIA_CARD_ITEMS_LIST;
     * ```
     */
    public static readonly MARUSIA_CARD_ITEMS_LIST = 'ItemsList';

    /**
     * Определяет максимальное количество изображений в списке.
     * При превышении этого количества лишние изображения будут отброшены.
     * @type {number}
     * @example
     * ```typescript
     * const maxImages = MarusiaCard.MARUSIA_MAX_IMAGES; // 5
     * ```
     */
    public static readonly MARUSIA_MAX_IMAGES = 5;

    /**
     * Получает элементы карточки для Маруси.
     *
     * Процесс работы:
     * 1. Ограничивает количество изображений
     * 2. Обрабатывает каждое изображение:
     *    - Создает токен изображения, если его нет
     *    - Добавляет кнопки (если не галерея)
     *    - Ограничивает длину текста
     *
     * @returns {Promise<IMarusiaImage[]>} Массив элементов карточки
     *
     * @example
     * ```typescript
     * const items = await this._getItem();
     * // items = [
     * //     {
     * //         title: 'Товар 1',
     * //         description: 'Описание 1',
     * //         image_id: '123456789',
     * //         button: { text: 'Купить' }
     * //     },
     * //     {
     * //         title: 'Товар 2',
     * //         description: 'Описание 2',
     * //         image_id: '987654321',
     * //         button: { text: 'Купить' }
     * //     }
     * // ]
     * ```
     */
    protected async _getItem(): Promise<IMarusiaImage[]> {
        const items: IMarusiaImage[] = [];
        const images = this.images.slice(0, MarusiaCard.MARUSIA_MAX_IMAGES);
        for (const image of images) {
            let button: IMarusiaButtonCard | null = image.button.getButtons<IMarusiaButtonCard>(
                Buttons.T_ALISA_CARD_BUTTON,
            );
            if (!button?.text) {
                button = null;
            }
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens(this._appContext);
                    mImage.type = ImageTokens.T_MARUSIA;
                    mImage.path = image.imageDir;
                    image.imageToken = await mImage.getToken();
                }
            }
            const item: IMarusiaImage = {
                title: Text.resize(image.title, 128),
            };
            item.description = Text.resize(image.desc, 256);
            if (image.imageToken) {
                item.image_id = image.imageToken;
            }
            if (button && !this.isUsedGallery) {
                item.button = button;
            }
            items.push(item);
        }
        return items;
    }

    /**
     * Получает карточку для отображения в Марусе.
     *
     * Процесс работы:
     * 1. Если isOne=true:
     *    - Создает карточку с большим изображением
     *    - Добавляет описание и кнопку
     * 2. Иначе:
     *    - Создает список элементов с заголовком
     *    - Добавляет кнопку в футер
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<IMarusiaBigImage | IMarusiaItemsList | null>} Карточка или null
     *
     * @example
     * ```typescript
     * const card = new MarusiaCard();
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     *
     * // Получить одну карточку
     * const singleCard = await card.getCard(true);
     * // singleCard = {
     * //     type: 'BigImage',
     * //     image_id: '123456789',
     * //     title: 'Товар 1',
     * //     description: 'Описание 1',
     * //     button: { text: 'Купить' }
     * // }
     *
     * // Получить список
     * const listCard = await card.getCard(false);
     * // listCard = {
     * //     type: 'ItemsList',
     * //     header: { text: 'Каталог товаров' },
     * //     items: [
     * //         { title: 'Товар 1', description: 'Описание 1', image_id: '123456789' },
     * //         { title: 'Товар 2', description: 'Описание 2', image_id: '987654321' }
     * //     ],
     * //     footer: { text: 'Купить', button: { text: 'Купить' } }
     * // }
     * ```
     */
    public async getCard(isOne: boolean): Promise<IMarusiaBigImage | IMarusiaItemsList | null> {
        this.button.type = Buttons.T_ALISA_CARD_BUTTON;
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.type = ImageTokens.T_MARUSIA;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    let button: IMarusiaButtonCard | null =
                        this.images[0].button.getButtons<IMarusiaButtonCard>(
                            Buttons.T_ALISA_CARD_BUTTON,
                        );
                    if (!button?.text) {
                        button = this.button.getButtons<IMarusiaButtonCard>();
                    }
                    const object: IMarusiaBigImage = {
                        type: MarusiaCard.MARUSIA_CARD_BIG_IMAGE,
                        image_id: this.images[0].imageToken,
                        title: Text.resize(this.images[0].title, 128),
                        description: Text.resize(this.images[0].desc, 256),
                    };
                    if (button?.text) {
                        object.button = button;
                    }
                    return object;
                }
            } else {
                const object: IMarusiaItemsList = {
                    type: MarusiaCard.MARUSIA_CARD_ITEMS_LIST,
                    header: {
                        text: Text.resize(this.title || '', 64),
                    },
                };
                object.items = await this._getItem();
                const btn: IMarusiaButtonCard | null = this.button.getButtons(
                    Buttons.T_ALISA_CARD_BUTTON,
                );
                if (btn?.text) {
                    object.footer = {
                        text: btn.text,
                        button: btn,
                    };
                }
                return object;
            }
        }
        return null;
    }
}
