import { Buttons, TButton } from '../button';
import { BotController } from '../../controller';
import { getImage, IImageType, initButton } from '../image/Image';
import { AppContext, TCardProcessing } from '../../core';

/**
 * @class Card
 * Класс для создания и управления карточками на различных платформах.
 *
 * Класс предоставляет функциональность для:
 * - Создания карточек с изображениями, заголовками и описаниями
 * - Добавления кнопок к карточкам
 * - Адаптации карточек под различные платформы
 * - Поддержки галерей изображений
 *
 * Ограничения платформ обрабатываются самими адаптерами
 */
export class Card {
    /**
     * Заголовок элемента карточки.
     * Отображается в верхней части карточки.
     * @example
     * ```ts
     * card.setTitle('Название товара');
     * ```
     */
    public title: string | null;

    /**
     * Описание элемента карточки.
     * Отображается под заголовком.
     * @example
     * ```ts
     * card.setDescription('Подробное описание товара');
     * ```
     */
    public desc: string | null;

    /**
     * Массив с изображениями или элементами карточки.
     * Каждый элемент может содержать изображение, заголовок, описание и кнопки.
     * @see IImageType
     * @example
     * ```ts
     * card.addImage('product.jpg', 'Название товара', 'Описание товара');
     * ```
     */
    public images: IImageType[];

    /**
     * Кнопки элемента карточки.
     * Используются для взаимодействия с пользователем.
     * @see Buttons
     * @example
     * ```ts
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
     * @example
     * ```ts
     * card.isOne = true; // Отобразить только первый элемент
     * ```
     */
    public isOne: boolean;

    /**
     * Использование галереи изображений.
     * true - изображения отображаются в виде галереи
     * false - изображения отображаются как отдельные карточки
     * @example
     * ```ts
     * card.isUsedGallery = true; // Включить режим галереи
     * ```
     */
    public isUsedGallery: boolean = false;

    /**
     * Произвольный шаблон для отображения карточки.
     * Используется для кастомизации отображения на определенных платформах.
     * ⚠️ ОПАСНО: Использование этого свойства полностью обходит адаптеры платформ.
     * Данные отправляются платформе «как есть» без преобразования в её формат.
     *
     * Последствия:
     * - Карточка может не отобразиться на других платформах
     * - Нарушается кроссплатформенность фреймворка
     * - Ответственность за корректность формата лежит на разработчике
     *
     * Используйте ТОЛЬКО если:
     * - Вы точно знаете формат ответа целевой платформы
     * - Стандартные методы (`addImage()`, `addButton()`) не решают задачу
     * @example
     * ```ts
     * card.template = {
     *     type: 'custom_card',
     *     content: { ... }
     * };
     * ```
     */
    public template: Record<string, unknown> | unknown | null = null;

    /**
     * Контекст приложения.
     */
    #appContext: AppContext;

    /**
     * Карточка с изображениями, заголовком и кнопками.
     *
     * Предоставляет унифицированный интерфейс для описания контента.
     * Фактическая адаптация под формат целевой платформы происходит
     * в адаптере платформы при вызове метода `getCards()`.
     * @param appContext Контекст приложения.
     * ⚠️ Обычно НЕ создаётся вручную — автоматически передаётся через контроллер:
     * ```ts
     * // Правильно — через контроллер:
     * this.card.addImage('token', 'Title');
     *
     * // НЕ рекомендуется — ручное создание:
     * new Card(this.appContext); // appContext берётся из контроллера
     * ```
     */
    public constructor(appContext: AppContext) {
        this.isOne = false;
        this.button = new Buttons(appContext);
        this.images = [];
        this.title = null;
        this.desc = null;
        this.#appContext = appContext;
        this.clear();
    }

    /**
     * Устанавливает контекст приложения.
     * @param appContext
     */
    public setAppContext(appContext: AppContext): this {
        this.#appContext = appContext;
        this.button.setAppContext(appContext);
        return this;
    }

    /**
     * Устанавливает заголовок для карточки.
     * @param {string} title - Заголовок карточки
     * @returns {Card}
     * @example
     * ```ts
     * card.setTitle('Название товара');
     * ```
     */
    public setTitle(title: string): this {
        this.title = title;
        return this;
    }

    /**
     * Устанавливает описание для карточки.
     * @param {string} description - Описание карточки
     * @returns {Card}
     * @example
     * ```ts
     * card.setDescription('Подробное описание товара');
     * ```
     */
    public setDescription(description: string): this {
        this.desc = description;
        return this;
    }

    /**
     * Добавляет кнопку в карточку.
     * @param {TButton} button - Кнопка для добавления (строка или объект)
     * @returns {Card}
     * @example
     * ```ts
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
    public addButton(button: TButton): this {
        initButton(button, this.button);
        return this;
    }

    /**
     * Очищает все элементы карточки.
     * @returns {void}
     * @example
     * ```ts
     * card.clear(); // Удалить все изображения
     * ```
     */
    public clear(): void {
        this.images = [];
        this.isOne = false;
        this.isUsedGallery = false;
    }

    /**
     * Добавляет изображение в карточку.
     * @param {string} image - Идентификатор или URL изображения
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton} [button=null] - Кнопки для элемента
     * @returns {Card}
     *
     * @remarks
     * Ограничения на изображения:
     * - Алиса: до 1MB, 1024x1024px, JPG/PNG
     * - VK: до 5MB, рекомендуется 13:8, JPG/PNG/GIF
     * - Telegram: до 10MB, 1280x1280px, JPG/PNG/WEBP
     * - Viber: до 1MB, рекомендуется 400x400px, JPG/PNG
     *
     * @example
     * ```ts
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
    ): this {
        const img = getImage(this.#appContext, image, title, desc, button);
        if (img) {
            this.images.push(img);
        }
        return this;
    }

    /**
     * Добавляет одно изображение в виде карточки. Внутри себя выставляет isOne в true.
     * Если ранее были указаны другие изображения, то они очистятся.
     * Стоит использовать в том случае, если у вас всегда должно отобразиться только 1 изображение.
     * @param {string} image - Идентификатор или URL изображения
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton} [button=null] - Кнопки для элемента
     * @returns {Card}
     */
    public addOneImage(
        image: string | null,
        title: string = ' ',
        desc: string = ' ',
        button: TButton | null = null,
    ): this {
        this.isOne = true;
        this.images = [];
        return this.addImage(image, title, desc, button);
    }

    /**
     * Получает карточку в формате для текущей платформы.
     */
    public getCards<TResult = unknown>(
        cardProcessing: TCardProcessing<TResult>,
        controller: BotController,
    ): TResult {
        if (this.template) {
            return this.template as TResult;
        }
        return cardProcessing(
            {
                usedGallery: this.isUsedGallery,
                buttons: this.button,
                images: this.images,
                title: this.title,
                description: this.desc,
                showOne: this.isOne,
            },
            controller,
        );
    }
}
