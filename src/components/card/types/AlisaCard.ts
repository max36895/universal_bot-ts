import { TemplateCardTypes } from './TemplateCardTypes';
import { Buttons } from '../../button';
import {
    IAlisaBigImage,
    IAlisaButtonCard,
    IAlisaImage,
    IAlisaImageGallery,
    IAlisaItemsList,
} from '../../../platforms/interfaces';
import { Text } from '../../../utils/standard/Text';
import { ImageTokens } from '../../../models/ImageTokens';

/**
 * @class AlisaCard
 * Класс для создания и отображения карточек в Алисе.
 * Наследуется от TemplateCardTypes и реализует специфичную для Алисы логику.
 *
 * Основные возможности:
 * - Создание больших изображений с описанием
 * - Создание списков элементов
 * - Создание галерей изображений
 * - Поддержка кнопок для каждого элемента
 * - Автоматическое ограничение длины текста
 * - Поддержка различных типов карточек (BigImage, ItemsList)
 * - Автоматическая обработка изображений и токенов
 *
 * Ограничения:
 * - Максимум 5 элементов в списке (ALISA_MAX_IMAGES)
 * - Максимум 7 изображений в галерее (ALISA_MAX_GALLERY_IMAGES)
 * - Длина заголовка: до 128 символов
 * - Длина описания: до 256 символов
 *
 * @example
 * ```typescript
 * // Создание простой карточки
 * const card = new AlisaCard();
 * card.images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
 * ];
 * const result = await card.getCard(false);
 *
 * // Создание галереи (максимум 7 изображений)
 * const galleryCard = new AlisaCard();
 * galleryCard.isUsedGallery = true;
 * galleryCard.images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
 * ];
 * const galleryResult = await galleryCard.getCard(false);
 * ```
 */
export class AlisaCard extends TemplateCardTypes {
    /**
     * Определяет тип карточки как большое изображение.
     * Используется для отображения одного изображения с описанием.
     *
     * Особенности:
     * - Отображает одно изображение в большом формате
     * - Поддерживает заголовок и описание
     * - Может содержать кнопку действия
     *
     * @type {string}
     * @example
     * ```typescript
     * const card = new AlisaCard();
     * card.type = AlisaCard.ALISA_CARD_BIG_IMAGE;
     * // Результат будет содержать одно большое изображение
     * // с заголовком, описанием и кнопкой
     * ```
     */
    public static readonly ALISA_CARD_BIG_IMAGE = 'BigImage';

    /**
     * Определяет тип карточки как список элементов.
     * Используется для отображения нескольких элементов с изображениями.
     *
     * Особенности:
     * - Отображает список элементов с изображениями
     * - Каждый элемент может иметь заголовок и описание
     * - Поддерживает кнопки для каждого элемента
     * - Имеет общий заголовок и кнопку в футере
     *
     * @type {string}
     * @example
     * ```typescript
     * const card = new AlisaCard();
     * card.type = AlisaCard.ALISA_CARD_ITEMS_LIST;
     * // Результат будет содержать список элементов
     * // с изображениями, заголовками и кнопками
     * ```
     */
    public static readonly ALISA_CARD_ITEMS_LIST = 'ItemsList';

    /**
     * Определяет максимальное количество изображений в списке.
     * При превышении этого количества лишние изображения будут отброшены.
     *
     * Особенности:
     * - Ограничивает количество элементов в списке
     * - Помогает оптимизировать производительность
     * - Улучшает пользовательский опыт
     *
     * @type {number}
     * @example
     * ```typescript
     * const maxImages = AlisaCard.ALISA_MAX_IMAGES; // 5
     * // Если в списке больше 5 изображений,
     * // будут отображаться только первые 5
     * ```
     */
    public static readonly ALISA_MAX_IMAGES = 5;

    /**
     * Определяет максимальное количество изображений в галерее.
     * При превышении этого количества лишние изображения будут отброшены.
     *
     * Особенности:
     * - Ограничивает количество изображений в галерее
     * - Оптимизирует загрузку и отображение
     * - Улучшает производительность
     *
     * @type {number}
     * @example
     * ```typescript
     * const maxGalleryImages = AlisaCard.ALISA_MAX_GALLERY_IMAGES; // 7
     * // Если в галерее больше 7 изображений,
     * // будут отображаться только первые 7
     * ```
     */
    public static readonly ALISA_MAX_GALLERY_IMAGES = 7;

    /**
     * Получает элементы карточки для Алисы.
     *
     * Процесс работы:
     * 1. Определяет максимальное количество изображений:
     *    - Для галереи: ALISA_MAX_GALLERY_IMAGES (7)
     *    - Для списка: ALISA_MAX_IMAGES (5)
     * 2. Обрабатывает каждое изображение:
     *    - Создает токен изображения, если его нет
     *    - Добавляет кнопки (если не галерея)
     *    - Ограничивает длину текста:
     *      * Заголовок: 128 символов
     *      * Описание: 256 символов
     *
     * @returns {Promise<IAlisaImage[]>} Массив элементов карточки
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
    protected async _getItem(): Promise<IAlisaImage[]> {
        const items: IAlisaImage[] = [];
        const maxCount = this.isUsedGallery
            ? AlisaCard.ALISA_MAX_GALLERY_IMAGES
            : AlisaCard.ALISA_MAX_IMAGES;
        const images = this.images.slice(0, maxCount);
        for (const image of images) {
            let button: IAlisaButtonCard | null = null;
            if (!this.isUsedGallery) {
                button = image.button.getButtons<IAlisaButtonCard>(Buttons.T_ALISA_CARD_BUTTON);
                if (!button?.text) {
                    button = null;
                }
            }
            if (!image.imageToken) {
                if (image.imageDir) {
                    const mImage = new ImageTokens(this._appContext);
                    mImage.type = ImageTokens.T_ALISA;
                    mImage.path = image.imageDir;
                    image.imageToken = await mImage.getToken();
                }
            }
            const item: IAlisaImage = {
                title: Text.resize(image.title, 128),
            };
            if (!this.isUsedGallery) {
                item.description = Text.resize(image.desc, 256);
            }
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
     * Получает карточку для отображения в Алисе.
     *
     * Процесс работы:
     * 1. Если isOne=true:
     *    - Создает карточку с большим изображением
     *    - Добавляет описание и кнопку
     *    - Возвращает объект типа IAlisaBigImage
     * 2. Иначе:
     *    - Если isUsedGallery=true:
     *      * Создает галерею изображений
     *      * Возвращает объект типа IAlisaImageGallery
     *    - Иначе:
     *      * Создает список элементов с заголовком
     *      * Добавляет кнопку в футер
     *      * Возвращает объект типа IAlisaItemsList
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null>} Карточка или null
     *
     * @example
     * ```typescript
     * const card = new AlisaCard();
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
     *
     * // Получить галерею
     * card.isUsedGallery = true;
     * const galleryCard = await card.getCard(false);
     * // galleryCard = {
     * //     type: 'ImageGallery',
     * //     items: [
     * //         { title: 'Товар 1', image_id: '123456789' },
     * //         { title: 'Товар 2', image_id: '987654321' }
     * //     ]
     * // }
     * ```
     */
    public async getCard(
        isOne: boolean,
    ): Promise<IAlisaBigImage | IAlisaItemsList | IAlisaImageGallery | null> {
        this.button.type = Buttons.T_ALISA_CARD_BUTTON;
        const countImage = this.images.length;
        if (countImage) {
            if (isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.type = ImageTokens.T_ALISA;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    let button: IAlisaButtonCard | null = this.images[0].button.getButtons(
                        Buttons.T_ALISA_CARD_BUTTON,
                    );
                    if (!button?.text) {
                        button = this.button.getButtons();
                    }
                    const object: IAlisaBigImage = {
                        type: AlisaCard.ALISA_CARD_BIG_IMAGE,
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
                if (this.isUsedGallery) {
                    const object: IAlisaImageGallery = {
                        type: 'ImageGallery',
                    };
                    object.items = await this._getItem();
                    return object;
                } else {
                    const object: IAlisaItemsList = {
                        type: AlisaCard.ALISA_CARD_ITEMS_LIST,
                        header: {
                            text: Text.resize(this.title || '', 64),
                        },
                    };
                    object.items = await this._getItem();
                    const btn: IAlisaButtonCard | null = this.button.getButtons(
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
        }
        return null;
    }
}
