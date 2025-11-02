import { Buttons, TButton } from '../button';
import { Image, initButton } from '../image/Image';
import { TemplateCardTypes } from './types/TemplateCardTypes';

import { AlisaCard } from './types/AlisaCard';
import { TelegramCard } from './types/TelegramCard';
import { VkCard } from './types/VkCard';
import { ViberCard } from './types/ViberCard';
import { MarusiaCard } from './types/MarusiaCard';
import { SmartAppCard } from './types/SmartAppCard';
import { MaxAppCard } from './types/MaxAppCard';
import {
    AppContext,
    T_ALISA,
    T_MARUSIA,
    T_MAXAPP,
    T_SMARTAPP,
    T_TELEGRAM,
    T_USER_APP,
    T_VIBER,
    T_VK,
} from '../../core/AppContext';

/**
 * @class Card
 * Класс для создания и управления карточками на различных платформах.
 *
 * Класс предоставляет функциональность для:
 * - Создания карточек с изображениями, заголовками и описаниями
 * - Добавления кнопок к карточкам
 * - Адаптации карточек под различные платформы (Алиса, VK, Telegram, Viber, Marusia, SmartApp)
 * - Поддержки галерей изображений
 *
 * Ограничения по платформам:
 *
 * Алиса:
 * - Максимум 5 элементов в галерее
 * - Изображения: до 1MB, 1024x1024px
 * - Форматы: JPG, PNG
 *
 * VK:
 * - Максимум 10 элементов в карусели
 * - Изображения: до 5MB, рекомендуется 13:8
 * - Форматы: JPG, PNG, GIF
 *
 * Telegram:
 * - Максимум 10 изображений в альбоме
 * - Изображения: до 10MB, 1280x1280px
 * - Форматы: JPG, PNG, WEBP
 *
 * Viber:
 * - Максимум 6 элементов в карусели
 * - Изображения: до 1MB, рекомендуется 400x400px
 * - Форматы: JPG, PNG
 *
 * @example
 * ```typescript
 * import { Card } from './components/card/Card';
 *
 * // Создание простой карточки
 * const card = new Card();
 * card.setTitle('Заголовок карточки')
 *     .setDescription('Описание карточки')
 *     .addImage('image.jpg', 'Заголовок изображения', 'Описание изображения')
 *     .addButton('Нажми меня');
 *
 * // Создание карточки с галереей
 * const galleryCard = new Card();
 * galleryCard.isUsedGallery = true;
 * galleryCard.addImage('image1.jpg', 'Изображение 1', 'Описание 1')
 *     .addImage('image2.jpg', 'Изображение 2', 'Описание 2')
 *     .addButton({
 *         title: 'Подробнее',
 *         url: 'https://example.com',
 *         payload: { action: 'details' }
 *     });
 *
 * // Кастомные шаблоны для разных платформ
 *
 * // Кастомное переопределение ответа, на примере: Алиса - BigImage
 * const alisaCard = new Card();
 * alisaCard.template = {
 *     type: 'BigImage',
 *     image_id: '123456/123456',
 *     title: 'Заголовок',
 *     description: 'Описание',
 *     button: {
 *         text: 'Кнопка',
 *         url: 'https://example.com'
 *     }
 * };
 *
 * // Кастомное переопределение ответа, на примере: VK - Карусель
 * const vkCard = new Card();
 * vkCard.template = {
 *     type: 'carousel',
 *     elements: [{
 *         photo_id: '-123456_789',
 *         title: 'Заголовок',
 *         description: 'Описание',
 *         buttons: [{
 *             action: {
 *                 type: 'text',
 *                 label: 'Кнопка',
 *                 payload: { button: 1 }
 *             }
 *         }]
 *     }]
 * };
 *
 * // Кастомное переопределение ответа, на примере: Telegram - HTML-разметка
 * const telegramCard = new Card();
 * telegramCard.template = {
 *     type: 'article',
 *     message_text: '<b>Заголовок</b>\n<i>Описание</i>',
 *     parse_mode: 'HTML',
 *     reply_markup: {
 *         inline_keyboard: [[{
 *             text: 'Кнопка',
 *             callback_data: 'button_1'
 *         }]]
 *     }
 * };
 *
 * // Кастомное переопределение ответа, на примере: Viber - Карусель
 * const viberCard = new Card();
 * viberCard.template = {
 *     type: 'carousel',
 *     elements: [{
 *         image: 'https://example.com/image.jpg',
 *         title: 'Заголовок',
 *         subtitle: 'Подзаголовок',
 *         buttons: [{
 *             text: 'Кнопка',
 *             actionType: 'reply',
 *             actionBody: 'button_1'
 *         }]
 *     }]
 * };
 *
 * // Получение карточки для текущей платформы
 * const cards = await card.getCards();
 * ```
 */
export class Card {
    /**
     * Заголовок элемента карточки.
     * Отображается в верхней части карточки.
     * @type {string | null}
     * @example
     * ```typescript
     * card.setTitle('Название товара');
     * ```
     */
    public title: string | null;

    /**
     * Описание элемента карточки.
     * Отображается под заголовком.
     * @type {string | null}
     * @example
     * ```typescript
     * card.setDescription('Подробное описание товара');
     * ```
     */
    public desc: string | null;

    /**
     * Массив с изображениями или элементами карточки.
     * Каждый элемент может содержать изображение, заголовок, описание и кнопки.
     * @type {Image[]}
     * @see Image
     * @example
     * ```typescript
     * card.addImage('product.jpg', 'Название товара', 'Описание товара');
     * ```
     */
    public images: Image[];

    /**
     * Кнопки элемента карточки.
     * Используются для взаимодействия с пользователем.
     * @type {Buttons}
     * @see Buttons
     * @example
     * ```typescript
     * card.addButton('Купить');
     * card.addButton({
     *     title: 'Подробнее',
     *     url: 'https://example.com'
     * });
     * ```
     */
    public button: Buttons;

    /**
     * Определяет необходимость отображения только одного элемента карточки.
     * true - отображается только первый элемент
     * false - отображаются все элементы
     * @type {boolean}
     * @example
     * ```typescript
     * card.isOne = true; // Отобразить только первый элемент
     * ```
     */
    public isOne: boolean;

    /**
     * Использование галереи изображений.
     * true - изображения отображаются в виде галереи
     * false - изображения отображаются как отдельные карточки
     * @type {boolean}
     * @example
     * ```typescript
     * card.isUsedGallery = true; // Включить режим галереи
     * ```
     */
    public isUsedGallery: boolean = false;

    /**
     * Произвольный шаблон для отображения карточки.
     * Используется для кастомизации отображения на определенных платформах. Не рекомендуется использовать при заание поддерживаемых платформ.
     * При использовании этого параметра вы сами отвечаете за корректное отображение.
     * @type {any}
     * @example
     * ```typescript
     * card.template = {
     *     type: 'custom_card',
     *     content: { ... }
     * };
     * ```
     */
    public template: any = null;

    /**
     * Контекст приложения.
     */
    protected _appContext: AppContext;

    /**
     * Создает новый экземпляр карточки.
     * Инициализирует все поля значениями по умолчанию.
     * @example
     * ```typescript
     * const card = new Card();
     * ```
     */
    public constructor(appContext: AppContext) {
        this.isOne = false;
        this.button = new Buttons(appContext);
        this.images = [];
        this.title = null;
        this.desc = null;
        this._appContext = appContext;
        this.clear();
    }

    /**
     * Устанавливает контекст приложения.
     * @param appContext
     */
    public setAppContext(appContext: AppContext): Card {
        this._appContext = appContext;
        this.button.setAppContext(appContext);
        return this;
    }

    /**
     * Устанавливает заголовок для карточки.
     * @param {string} title - Заголовок карточки
     * @returns {Card} this для цепочки вызовов
     * @example
     * ```typescript
     * card.setTitle('Название товара');
     * ```
     */
    public setTitle(title: string): Card {
        this.title = title;
        return this;
    }

    /**
     * Устанавливает описание для карточки.
     * @param {string} description - Описание карточки
     * @returns {Card} this для цепочки вызовов
     * @example
     * ```typescript
     * card.setDescription('Подробное описание товара');
     * ```
     */
    public setDescription(description: string): Card {
        this.desc = description;
        return this;
    }

    /**
     * Добавляет кнопку в карточку.
     * @param {TButton} button - Кнопка для добавления (строка или объект)
     * @returns {Card} this для цепочки вызовов
     * @example
     * ```typescript
     * // Добавление простой кнопки
     * card.addButton('Купить');
     *
     * // Добавление кнопки с дополнительными параметрами
     * card.addButton({
     *     title: 'Подробнее',
     *     url: 'https://example.com',
     *     payload: { action: 'details' }
     * });
     * ```
     */
    public addButton(button: TButton): Card {
        initButton(button, this.button);
        return this;
    }

    /**
     * Очищает все элементы карточки.
     * @returns {void}
     * @example
     * ```typescript
     * card.clear(); // Удалить все изображения
     * ```
     */
    public clear(): void {
        this.images = [];
        this.isOne = false;
        this.isUsedGallery = false;
    }

    /**
     * Вставляет элемент в карточку|список.
     * @param {string} image - Идентификатор или расположение изображения
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton} [button=null] - Кнопки для элемента
     * @returns {boolean} true если элемент успешно добавлен
     * @deprecated Используйте метод addImage вместо этого. Будет удален в версию 2.2.0
     * @example
     * ```typescript
     * // Устаревший метод - не рекомендуется использовать
     * const success = card.add('product.jpg', 'Название', 'Описание');
     *
     * // Рекомендуемый метод
     * card.addImage('product.jpg', 'Название', 'Описание');
     * ```
     */
    public add(
        image: string | null,
        title: string,
        desc: string = ' ',
        button: TButton | null = null,
    ): boolean {
        const imageLength: number = this.images.length;
        this.addImage(image, title, desc, button);
        return imageLength < this.images.length;
    }

    /**
     * Добавляет изображение в карточку.
     * @param {string} image - Идентификатор или URL изображения
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton} [button=null] - Кнопки для элемента
     * @returns {Card} this для цепочки вызовов
     *
     * @remarks
     * Ограничения на изображения:
     * - Алиса: до 1MB, 1024x1024px, JPG/PNG
     * - VK: до 5MB, рекомендуется 13:8, JPG/PNG/GIF
     * - Telegram: до 10MB, 1280x1280px, JPG/PNG/WEBP
     * - Viber: до 1MB, рекомендуется 400x400px, JPG/PNG
     *
     * @example
     * ```typescript
     * // Добавление одного изображения
     * card.addImage('image.jpg', 'Название', 'Описание');
     *
     * // Добавление изображения с кнопкой
     * card.addImage('product.jpg', 'Товар', 'Описание', {
     *     title: 'Купить',
     *     url: 'https://shop.com/product',
     *     payload: { action: 'buy', id: 123 }
     * });
     *
     * // Добавление нескольких изображений в галерею
     * card.isUsedGallery = true;
     * card.addImage('image1.jpg', 'Фото 1')
     *     .addImage('image2.jpg', 'Фото 2')
     *     .addImage('image3.jpg', 'Фото 3');
     * ```
     */
    public addImage(
        image: string | null,
        title: string = ' ',
        desc: string = ' ',
        button: TButton | null = null,
    ): Card {
        const img = new Image(this._appContext);
        if (img.init(image, title, desc, button)) {
            this.images.push(img);
        }
        return this;
    }

    /**
     * Добавляет одно изображение в виде карточки. Внутри себя выставляет isOne в true
     * @param {string} image - Идентификатор или URL изображения
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton} [button=null] - Кнопки для элемента
     * @returns {Card} this для цепочки вызовов
     */
    public addOneImage(
        image: string | null,
        title: string = ' ',
        desc: string = ' ',
        button: TButton | null = null,
    ): Card {
        this.isOne = true;
        this.images = [];
        return this.addImage(image, title, desc, button);
    }

    /**
     * Получает карточку в формате для текущей платформы.
     * @param {TemplateCardTypes | null} [userCard=null] - Пользовательский шаблон карточки
     * @returns {Promise<any>} Карточка в формате текущей платформы
     *
     * @remarks
     * Возвращаемые значения зависят от платформы:
     *
     * Алиса:
     * ```typescript
     * {
     *     type: 'BigImage',
     *     image_id: string,
     *     title?: string,
     *     description?: string,
     *     button?: {
     *         text: string,
     *         url?: string,
     *         payload?: any
     *     }
     * }
     * ```
     *
     * VK:
     * ```typescript
     * {
     *     type: 'carousel',
     *     elements: [{
     *         photo_id: string,
     *         title?: string,
     *         description?: string,
     *         buttons?: Array<{
     *             action: {
     *                 type: string,
     *                 label: string,
     *                 payload?: any
     *             }
     *         }>
     *     }]
     * }
     * ```
     *
     * Telegram:
     * ```typescript
     * {
     *     type: string,
     *     media: Array<{
     *         type: 'photo',
     *         media: string,
     *         caption?: string
     *     }>,
     *     reply_markup?: {
     *         inline_keyboard: Array<Array<{
     *             text: string,
     *             url?: string,
     *             callback_data?: string
     *         }>>
     *     }
     * }
     * ```
     *
     * @example
     * ```typescript
     * // Получение карточки для текущей платформы
     * const card = new Card();
     * card.addImage('image.jpg', 'Название', 'Описание')
     *     .addButton('Подробнее');
     *
     * const result = await card.getCards();
     * console.log(result);
     *
     * // Использование пользовательского шаблона
     * const customTemplate = {
     *     type: 'custom',
     *     content: { ... }
     * };
     * const customResult = await card.getCards(customTemplate);
     * ```
     */
    public async getCards(userCard: TemplateCardTypes | null = null): Promise<any> {
        if (this.template) {
            return this.template;
        }
        let card = null;
        switch (this._appContext.appType) {
            case T_ALISA:
                card = new AlisaCard(this._appContext);
                break;
            case T_VK:
                card = new VkCard(this._appContext);
                break;
            case T_TELEGRAM:
                card = new TelegramCard(this._appContext);
                break;
            case T_VIBER:
                card = new ViberCard(this._appContext);
                break;
            case T_MARUSIA:
                card = new MarusiaCard(this._appContext);
                break;
            case T_SMARTAPP:
                card = new SmartAppCard(this._appContext);
                break;
            case T_MAXAPP:
                card = new MaxAppCard(this._appContext);
                break;
            case T_USER_APP:
                card = userCard;
                break;
        }
        if (card) {
            card.isUsedGallery = this.isUsedGallery;
            card.images = this.images;
            card.button = this.button;
            card.title = this.title;
            return await card.getCard(this.isOne);
        }
        return {};
    }

    /**
     * Возвращает JSON-строку со всеми элементами карточки.
     * @param {TemplateCardTypes} [userCard=null] - Пользовательский класс для отображения карточки
     * @returns {Promise<string>} JSON-строка с данными карточки
     * @example
     * ```typescript
     * const cardJson = await card.getCardsJson();
     * ```
     */
    public async getCardsJson(userCard: TemplateCardTypes | null = null): Promise<string> {
        return JSON.stringify(await this.getCards(userCard));
    }
}
