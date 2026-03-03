import { TemplateCardTypes } from './TemplateCardTypes';
import { ImageTokens } from '../../../models/ImageTokens';
import { Buttons, IVkButton } from '../../button';

/**
 * @interface IVkCardElement
 * Интерфейс для элемента карточки ВКонтакте.
 * Определяет структуру отдельного элемента в карусели или галерее.
 *
 * Особенности:
 * - Поддерживает заголовок и описание
 * - Может содержать до 3 кнопок
 * - Поддерживает различные типы действий
 * - Требует ID фотографии из ВКонтакте
 *
 * @example
 * ```typescript
 * // Создание элемента карточки с кнопками
 * const element: IVkCardElement = {
 *     title: 'Название товара',
 *     description: 'Описание товара',
 *     photo_id: '123456789',
 *     buttons: [
 *         { action: { type: 'text', label: 'Купить' } },
 *         { action: { type: 'link', link: 'https://example.com' } }
 *     ],
 *     action: { type: 'open_photo' }
 * };
 *
 * // Создание простого элемента карточки
 * const simpleElement: IVkCardElement = {
 *     title: 'Фотография',
 *     description: 'Описание фотографии',
 *     photo_id: '987654321'
 * };
 * ```
 */
export interface IVkCardElement {
    /**
     * Заголовок элемента карточки.
     * Отображается в верхней части элемента.
     *
     * Особенности:
     * - Рекомендуемая длина: до 80 символов
     * - Поддерживает эмодзи
     * - Отображается жирным шрифтом
     *
     * @type {string}
     * @example
     * ```typescript
     * title: 'Название товара'
     * title: '🔥 Горячее предложение'
     * ```
     */
    title: string;

    /**
     * Описание элемента карточки.
     * Отображается под заголовком.
     *
     * Особенности:
     * - Рекомендуемая длина: до 200 символов
     * - Поддерживает переносы строк
     * - Может содержать ссылки
     *
     * @type {string}
     * @example
     * ```typescript
     * description: 'Подробное описание товара'
     * description: 'Цена: 1000 руб.\nДоставка: бесплатно'
     * ```
     */
    description: string;

    /**
     * Идентификатор изображения в ВКонтакте.
     * Формат: строка без префикса 'photo'.
     *
     * Особенности:
     * - Должен быть валидным ID фотографии
     * - Фотография должна быть загружена в ВКонтакте
     * - Поддерживает различные форматы изображений
     *
     * @type {string}
     * @example
     * ```typescript
     * photo_id: '123456789'
     * photo_id: '987654321_456789'
     * ```
     */
    photo_id: string;

    /**
     * Массив кнопок для элемента карточки.
     * Максимальное количество кнопок - 3.
     *
     * Особенности:
     * - Поддерживает различные типы кнопок
     * - Каждая кнопка может иметь свое действие
     * - Кнопки отображаются в нижней части карточки
     *
     * @type {IVkButton[]}
     * @example
     * ```typescript
     * // Кнопки с разными действиями
     * buttons: [
     *     { action: { type: 'text', label: 'Купить' } },
     *     { action: { type: 'link', link: 'https://example.com' } },
     *     { action: { type: 'callback', label: 'Подробнее' } }
     * ]
     *
     * // Одна кнопка
     * buttons: [
     *     { action: { type: 'text', label: 'Подробнее' } }
     * ]
     * ```
     */
    buttons?: IVkButton[];

    /**
     * Действие, происходящее при нажатии на элемент карточки.
     *
     * Особенности:
     * - Определяет поведение при клике на карточку
     * - Может открывать фотографию или выполнять другие действия
     * - Работает независимо от кнопок
     *
     * @type {{ type: string }}
     * @example
     * ```typescript
     * // Открыть фотографию
     * action: { type: 'open_photo' }
     *
     * // Выполнить действие
     * action: { type: 'callback' }
     * ```
     */
    action?: {
        /**
         * Тип действия.
         */
        type: string;
    };
}

/**
 * @interface IVkCard
 * Интерфейс для карточки ВКонтакте.
 * Определяет структуру карточки, которая может быть каруселью или галереей.
 *
 * Особенности:
 * - Поддерживает два типа карточек: карусель и галерея
 * - Может содержать множество элементов
 * - Элементы могут иметь кнопки и действия
 * - Поддерживает различные форматы изображений
 *
 * @example
 * ```typescript
 * // Создание карусели с товарами
 * const carousel: IVkCard = {
 *     type: 'carousel',
 *     elements: [
 *         {
 *             title: 'Товар 1',
 *             description: 'Описание 1',
 *             photo_id: '123456789',
 *             buttons: [{ action: { type: 'text', label: 'Купить' } }]
 *         },
 *         {
 *             title: 'Товар 2',
 *             description: 'Описание 2',
 *             photo_id: '987654321',
 *             buttons: [{ action: { type: 'text', label: 'Купить' } }]
 *         }
 *     ]
 * };
 *
 * // Создание галереи фотографий
 * const gallery: IVkCard = {
 *     type: 'gallery',
 *     elements: [
 *         {
 *             title: 'Фото 1',
 *             description: 'Описание 1',
 *             photo_id: '123456789',
 *             action: { type: 'open_photo' }
 *         },
 *         {
 *             title: 'Фото 2',
 *             description: 'Описание 2',
 *             photo_id: '987654321',
 *             action: { type: 'open_photo' }
 *         }
 *     ]
 * };
 * ```
 */
export interface IVkCard {
    /**
     * Тип карточки.
     * Может быть 'carousel' для карусели или 'gallery' для галереи.
     *
     * Особенности:
     * - Карусель: элементы можно листать горизонтально
     * - Галерея: элементы отображаются в сетке
     * - Тип определяет способ отображения элементов
     *
     * @type {string}
     * @example
     * ```typescript
     * // Карусель товаров
     * type: 'carousel'
     *
     * // Галерея фотографий
     * type: 'gallery'
     * ```
     */
    type: string;

    /**
     * Массив элементов карточки.
     * Каждый элемент представляет собой отдельную карточку в карусели.
     *
     * Особенности:
     * - Может содержать множество элементов
     * - Каждый элемент имеет свои настройки
     * - Элементы отображаются в зависимости от типа карточки
     *
     * @type {IVkCardElement[]}
     * @example
     * ```typescript
     * // Элементы карусели
     * elements: [
     *     { title: 'Товар 1', description: 'Описание 1', photo_id: '123456789' },
     *     { title: 'Товар 2', description: 'Описание 2', photo_id: '987654321' }
     * ]
     *
     * // Элементы галереи
     * elements: [
     *     { title: 'Фото 1', description: 'Описание 1', photo_id: '123456789' },
     *     { title: 'Фото 2', description: 'Описание 2', photo_id: '987654321' }
     * ]
     * ```
     */
    elements: IVkCardElement[];
}

/**
 * @class VkCard
 * Класс для создания и отображения карточек в ВКонтакте.
 * Наследуется от TemplateCardTypes и реализует специфичную для ВКонтакте логику.
 *
 * Основные возможности:
 * - Создание карусели с карточками
 * - Создание галереи изображений
 * - Поддержка кнопок (до 3 кнопок на карточку)
 * - Автоматическая загрузка изображений в ВКонтакте
 * - Поддержка различных типов действий
 * - Ограничение длины текста
 * - Форматирование описаний
 *
 * @example
 * ```typescript
 * // Создание карусели с товарами
 * const card = new VkCard();
 * card.title = 'Каталог товаров';
 * card.images = [
 *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
 *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
 * ];
 * const carousel = await card.getCard(false);
 *
 * // Создание галереи фотографий
 * const galleryCard = new VkCard();
 * galleryCard.isUsedGallery = true;
 * galleryCard.images = [
 *     new Image('photo1.jpg', 'Фото 1', 'Описание 1'),
 *     new Image('photo2.jpg', 'Фото 2', 'Описание 2')
 * ];
 * const gallery = await galleryCard.getCard(false);
 * ```
 */
export class VkCard extends TemplateCardTypes {
    /**
     * Получает карточку для отображения в ВКонтакте.
     *
     * Процесс работы:
     * 1. Проверяет количество изображений
     * 2. Если isOne=true или одно изображение:
     *    - Загружает изображение в ВКонтакте
     *    - Возвращает массив с ID изображения
     * 3. Иначе:
     *    - Создает карусель или галерею
     *    - Загружает все изображения
     *    - Добавляет кнопки (до 3 на карточку)
     *    - Форматирует текст (заголовок и описание)
     *
     * @param {boolean} isOne - Флаг отображения только одного элемента
     * @returns {Promise<IVkCard | string[]>} Карточка или массив ID изображений
     *
     * @example
     * ```typescript
     * const card = new VkCard();
     * card.images = [
     *     new Image('product1.jpg', 'Товар 1', 'Описание 1'),
     *     new Image('product2.jpg', 'Товар 2', 'Описание 2')
     * ];
     *
     * // Получить одну карточку
     * const singleCard = await card.getCard(true);
     * // singleCard = ['123456789']
     *
     * // Получить карусель
     * const carousel = await card.getCard(false);
     * // carousel = {
     * //     type: 'carousel',
     * //     elements: [
     * //         { title: 'Товар 1', description: 'Описание 1', photo_id: '123456789' },
     * //         { title: 'Товар 2', description: 'Описание 2', photo_id: '987654321' }
     * //     ]
     * // }
     *
     * // Получить галерею
     * card.isUsedGallery = true;
     * const gallery = await card.getCard(false);
     * // gallery = {
     * //     type: 'gallery',
     * //     elements: [
     * //         { title: 'Товар 1', description: 'Описание 1', photo_id: '123456789' },
     * //         { title: 'Товар 2', description: 'Описание 2', photo_id: '987654321' }
     * //     ]
     * // }
     * ```
     */
    public async getCard(isOne: boolean): Promise<IVkCard | string[]> {
        const object: IVkCard | string[] = [];
        const countImage = this.images.length;
        if (countImage) {
            if (countImage === 1 || isOne) {
                if (!this.images[0].imageToken) {
                    if (this.images[0].imageDir) {
                        const mImage = new ImageTokens(this._appContext);
                        mImage.userId = this.userId;
                        mImage.appId = this.appId;
                        mImage.type = ImageTokens.T_VK;
                        mImage.path = this.images[0].imageDir;
                        this.images[0].imageToken = await mImage.getToken();
                    }
                }
                if (this.images[0].imageToken) {
                    object.push(this.images[0].imageToken);
                    return object;
                }
            } else {
                const elements = [];
                for (let i = 0; i < this.images.length; i++) {
                    const image = this.images[i];
                    if (!image.imageToken) {
                        if (image.imageDir) {
                            const mImage = new ImageTokens(this._appContext);
                            mImage.userId = this.userId;
                            mImage.appId = this.appId;
                            mImage.type = ImageTokens.T_VK;
                            mImage.path = image.imageDir;
                            image.imageToken = await mImage.getToken();
                        }
                    }
                    if (image.imageToken) {
                        if (this.isUsedGallery) {
                            const element: IVkCardElement = {
                                title: image.title,
                                description: image.desc,
                                photo_id: image.imageToken.replace('photo', ''),
                            };
                            const button = image.button.getButtons(Buttons.T_VK_BUTTONS);
                            if (button?.buttons?.length) {
                                element.buttons = button.buttons.slice(0, 3);
                            }
                            elements.push(element);
                            //object.push(image.imageToken);
                        } else {
                            const element: IVkCardElement = {
                                title: image.title,
                                description: image.desc,
                                photo_id: image.imageToken.replace('photo', ''),
                            };
                            const button = image.button.getButtons(Buttons.T_VK_BUTTONS);
                            /*
                             * У карточки в любом случае должна быть хоть одна кнопка.
                             * Максимальное количество кнопок 3
                             */
                            if (button.one_time) {
                                element.buttons = button.buttons.splice(0, 3);
                                element.action = { type: 'open_photo' };
                                elements.push(element);
                            }
                        }
                    }
                }
                if (elements.length) {
                    return {
                        type: 'carousel',
                        elements,
                    };
                }
            }
        }
        return object;
    }
}
