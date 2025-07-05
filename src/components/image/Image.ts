import { Buttons, TButton, TButtonPayload } from '../button';
import { Text, isFile } from '../../utils';
import {
    ISberSmartAppCardPadding,
    TSberSmartAppTextColor,
    TSberSmartAppTypeface,
} from '../../platforms/interfaces';

/**
 * @interface IImageParams
 * Интерфейс параметров изображения для настройки отображения в различных платформах.
 *
 * Особенности:
 * - Поддерживает настройку стилей текста
 * - Позволяет задавать цвета и отступы
 * - Контролирует количество строк текста
 * - Расширяется дополнительными параметрами
 *
 * @example
 * ```typescript
 * // Базовые параметры
 * const params: IImageParams = {
 *     titleTypeface: 'headline2',
 *     titleText_color: 'default',
 *     descTypeface: 'body3',
 *     descText_color: 'secondary'
 * };
 *
 * // Расширенные параметры
 * const extendedParams: IImageParams = {
 *     titleTypeface: 'headline2',
 *     titleText_color: 'default',
 *     titleMargins: { top: '4x', left: '8x', right: '8x' },
 *     titleMax_lines: 2,
 *     descTypeface: 'body3',
 *     descText_color: 'secondary',
 *     descMargins: { top: '2x', left: '8x', right: '8x' },
 *     descMax_lines: 3,
 *     customParam: 'value'
 * };
 * ```
 */
export interface IImageParams {
    /**
     * Стиль верхнего текста (заголовка).
     * Определяет типографику для заголовка изображения.
     *
     * @type {TSberSmartAppTypeface}
     * @example
     * ```typescript
     * titleTypeface: 'headline2' // Основной заголовок
     * titleTypeface: 'title1'    // Крупный заголовок
     * titleTypeface: 'body1'     // Обычный текст
     * ```
     */
    titleTypeface?: TSberSmartAppTypeface;

    /**
     * Цвет верхнего текста (заголовка).
     * Определяет цветовое оформление заголовка.
     *
     * @type {TSberSmartAppTextColor}
     * @example
     * ```typescript
     * titleText_color: 'default'   // Основной цвет
     * titleText_color: 'secondary' // Вторичный цвет
     * titleText_color: 'brand'     // Цвет бренда
     * ```
     */
    titleText_color?: TSberSmartAppTextColor;

    /**
     * Отступы для верхнего текста (заголовка).
     * Определяет пространство вокруг заголовка.
     *
     * @type {ISberSmartAppCardPadding}
     * @example
     * ```typescript
     * titleMargins: {
     *     top: '4x',
     *     left: '8x',
     *     right: '8x'
     * }
     * ```
     */
    titleMargins?: ISberSmartAppCardPadding;

    /**
     * Максимальное количество строк для верхнего текста.
     * Ограничивает высоту заголовка.
     *
     * @type {number}
     * @example
     * ```typescript
     * titleMax_lines: 2 // Заголовок в две строки
     * titleMax_lines: 1 // Однострочный заголовок
     * ```
     */
    titleMax_lines?: number;

    /**
     * Стиль нижнего текста (описания).
     * Определяет типографику для описания изображения.
     *
     * @type {TSberSmartAppTypeface}
     * @example
     * ```typescript
     * descTypeface: 'body3'    // Мелкий текст
     * descTypeface: 'footnote1' // Сноска
     * descTypeface: 'body1'    // Обычный текст
     * ```
     */
    descTypeface?: TSberSmartAppTypeface;

    /**
     * Цвет нижнего текста (описания).
     * Определяет цветовое оформление описания.
     *
     * @type {TSberSmartAppTextColor}
     * @example
     * ```typescript
     * descText_color: 'secondary' // Вторичный цвет
     * descText_color: 'default'   // Основной цвет
     * descText_color: 'brand'     // Цвет бренда
     * ```
     */
    descText_color?: TSberSmartAppTextColor;

    /**
     * Отступы для нижнего текста (описания).
     * Определяет пространство вокруг описания.
     *
     * @type {ISberSmartAppCardPadding}
     * @example
     * ```typescript
     * descMargins: {
     *     top: '2x',
     *     left: '8x',
     *     right: '8x'
     * }
     * ```
     */
    descMargins?: ISberSmartAppCardPadding;

    /**
     * Максимальное количество строк для нижнего текста.
     * Ограничивает высоту описания.
     *
     * @type {number}
     * @example
     * ```typescript
     * descMax_lines: 3 // Описание в три строки
     * descMax_lines: 2 // Описание в две строки
     * ```
     */
    descMax_lines?: number;

    /**
     * Дополнительные параметры изображения.
     * Позволяет расширять интерфейс специфичными параметрами.
     *
     * @type {any}
     * @example
     * ```typescript
     * // Добавление пользовательских параметров
     * const params: IImageParams = {
     *     titleTypeface: 'headline2',
     *     customWidth: '100%',
     *     customHeight: '200px',
     *     customStyle: { borderRadius: '8px' }
     * };
     * ```
     */
    [name: string]: any;
}

export function initButton(button: TButton, buttonInst: Buttons) {
    if (typeof button === 'string') {
        buttonInst.addBtn(button);
    } else {
        const title: string | null = button.title || button.text || null;
        const url: string | null = button.url || null;
        const payload: TButtonPayload = button.payload || null;
        buttonInst.addBtn(title, url, payload);
    }
}

/**
 * @class Image
 * Класс для обработки и отображения изображений в различных платформах.
 *
 * Основные возможности:
 * - Управление изображениями и их метаданными
 * - Поддержка различных источников изображений (URL, файлы, токены)
 * - Настройка отображения текста (заголовок и описание)
 * - Добавление кнопок и действий
 * - Гибкая настройка параметров отображения
 *
 * @example
 * ```typescript
 * // Создание изображения из URL
 * const image = new Image();
 * image.init(
 *     'https://example.com/image.jpg',
 *     'Заголовок изображения',
 *     'Описание изображения',
 *     { title: 'Нажми меня', url: 'https://example.com' }
 * );
 *
 * // Создание изображения из файла
 * const localImage = new Image();
 * localImage.init(
 *     '/path/to/image.jpg',
 *     'Локальное изображение',
 *     'Описание локального изображения'
 * );
 *
 * // Создание изображения с токеном
 * const tokenImage = new Image();
 * tokenImage.isToken = true;
 * tokenImage.init(
 *     'image_token_123',
 *     'Изображение по токену',
 *     'Описание изображения по токену'
 * );
 * ```
 */
export class Image {
    /**
     * Кнопки для обработки действий с изображением.
     * Зависит от типа приложения и платформы.
     *
     * @type {Buttons}
     * @see Buttons
     * @example
     * ```typescript
     * const image = new Image();
     * image.button.addBtn('Нажми меня', 'https://example.com');
     * image.button.addBtn('Другая кнопка', null, { action: 'custom' });
     * ```
     */
    public button: Buttons;

    /**
     * Заголовок изображения.
     * Отображается над изображением.
     *
     * @type {string}
     * @example
     * ```typescript
     * const image = new Image();
     * image.title = 'Название товара';
     * ```
     */
    public title: string;

    /**
     * Описание изображения.
     * Отображается под изображением.
     *
     * @type {string}
     * @example
     * ```typescript
     * const image = new Image();
     * image.desc = 'Подробное описание товара';
     * ```
     */
    public desc: string;

    /**
     * Идентификатор изображения.
     * Используется для платформ, поддерживающих токены.
     *
     * @type {string | null}
     * @example
     * ```typescript
     * const image = new Image();
     * image.imageToken = 'image_token_123';
     * ```
     */
    public imageToken: string | null;

    /**
     * Путь к изображению.
     * Может быть URL или путь к файлу.
     *
     * @type {string | null}
     * @example
     * ```typescript
     * const image = new Image();
     * image.imageDir = 'https://example.com/image.jpg';
     * // или
     * image.imageDir = '/path/to/image.jpg';
     * ```
     */
    public imageDir: string | null;

    /**
     * Флаг использования токена.
     * Если true, то imageToken используется как идентификатор.
     *
     * @type {boolean}
     * @default false
     * @example
     * ```typescript
     * const image = new Image();
     * image.isToken = true;
     * image.init('image_token_123', 'Заголовок', 'Описание');
     * ```
     */
    public isToken: boolean;

    /**
     * Дополнительные параметры изображения.
     * Настройки отображения для разных платформ.
     *
     * @type {IImageParams}
     * @example
     * ```typescript
     * const image = new Image();
     * image.params = {
     *     titleTypeface: 'headline2',
     *     titleText_color: 'default',
     *     descTypeface: 'body3',
     *     descText_color: 'secondary'
     * };
     * ```
     */
    public params: IImageParams;

    /**
     * Конструктор класса Image.
     * Инициализирует все свойства значениями по умолчанию.
     *
     * @param {string | null} image - Путь к изображению или токен
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton | null} [button=null] - Кнопки для изображения
     *
     * @example
     * ```typescript
     * const image = new Image();
     * // image.button = new Buttons()
     * // image.title = ''
     * // image.desc = ''
     * // image.imageToken = null
     * // image.imageDir = null
     * // image.isToken = false
     * // image.params = {}
     * ```
     */
    public constructor(
        image: string | null = null,
        title: string = '',
        desc: string = ' ',
        button: TButton | null = null,
    ) {
        this.button = new Buttons();
        this.title = title;
        this.desc = desc;
        this.imageToken = null;
        this.imageDir = null;
        this.isToken = false;
        this.params = {};
        this.init(image, title, desc, button);
    }

    /**
     * Инициализация изображения.
     * Устанавливает основные параметры изображения и проверяет их корректность.
     *
     * Процесс работы:
     * 1. Проверяет тип изображения (токен или путь):
     *    - Если isToken=true, использует image как токен
     *    - Иначе проверяет валидность URL или файла
     * 2. Устанавливает заголовок и описание:
     *    - Если заголовок пустой, возвращает false
     *    - Если описание пустое, устанавливает пробел
     * 3. Добавляет кнопки, если они есть:
     *    - Поддерживает строковые кнопки
     *    - Поддерживает объекты кнопок
     *
     * @param {string | null} image - Путь к изображению или токен
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton | null} [button=null] - Кнопки для изображения
     * @returns {boolean} true если инициализация успешна, false в противном случае
     *
     * @example
     * ```typescript
     * const image = new Image();
     *
     * // Инициализация с URL
     * image.init(
     *     'https://example.com/image.jpg',
     *     'Заголовок',
     *     'Описание',
     *     { title: 'Кнопка', url: 'https://example.com' }
     * );
     *
     * // Инициализация с токеном
     * image.isToken = true;
     * image.init(
     *     'image_token_123',
     *     'Заголовок',
     *     'Описание'
     * );
     *
     * // Инициализация с простой кнопкой
     * image.init(
     *     'https://example.com/image.jpg',
     *     'Заголовок',
     *     'Описание',
     *     'Текст кнопки'
     * );
     * ```
     */
    public init(
        image: string | null,
        title: string,
        desc: string = ' ',
        button: TButton | null = null,
    ): boolean {
        if (this.isToken) {
            this.imageToken = image;
        } else {
            if (image && (Text.isUrl(image) || isFile(image))) {
                this.imageDir = image;
                this.imageToken = null;
            } else {
                this.imageToken = image;
            }
        }
        if (title) {
            this.title = title;
            if (!desc) {
                desc = ' ';
            }
            this.desc = desc;
            if (button) {
                initButton(button, this.button);
            }
            return true;
        }
        return false;
    }
}
