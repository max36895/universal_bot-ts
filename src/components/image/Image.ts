import { Buttons, TButton } from '../button';
import { Text, isFile } from '../../utils';
import { AppContext } from '../../core';

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
 * ```ts
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
     * Дополнительные параметры изображения.
     * Позволяет расширять интерфейс специфичными параметрами.
     *
     * @type {any}
     * @example
     * ```ts
     * // Добавление пользовательских параметров
     * const params: IImageParams = {
     *     titleTypeface: 'headline2',
     *     customWidth: '100%',
     *     customHeight: '200px',
     *     customStyle: { borderRadius: '8px' }
     * };
     * ```
     */
    [name: string]: unknown;
}

/**
 * Инициализация кнопки.
 * @param button
 * @param buttonInst
 */
export function initButton(button: TButton, buttonInst: Buttons): void {
    if (typeof button === 'string') {
        buttonInst.addBtn(button);
    } else {
        const title: string | null = button.title || button.text || null;
        const url: string | null = button.url || null;
        const payload = button.payload || null;
        buttonInst.addBtn(title, url, payload as Record<string, unknown>);
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
 * ```ts
 * // Создание изображения из URL
 * const image = new Image(appContext);
 * image.init(
 *     'https://example.com/image.jpg',
 *     'Заголовок изображения',
 *     'Описание изображения',
 *     { title: 'Нажми меня', url: 'https://example.com' }
 * );
 *
 * // Создание изображения из файла
 * const localImage = new Image(appContext);
 * localImage.init(
 *     '/path/to/image.jpg',
 *     'Локальное изображение',
 *     'Описание локального изображения'
 * );
 *
 * // Создание изображения с токеном
 * const tokenImage = new Image(appContext);
 * tokenImage.isToken = true;
 * tokenImage.init(
 *     'image_token_123',
 *     'Изображение по токену',
 *     'Описание изображения по токену'
 * );
 * ```
 */
export class Image<TImageParams extends IImageParams = IImageParams> {
    /**
     * Кнопки для обработки действий с изображением.
     * Зависит от типа приложения и платформы.
     *
     * @type {Buttons}
     * @see Buttons
     * @example
     * ```ts
     * const image = new Image(appContext);
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
     * ```ts
     * const image = new Image(appContext);
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
     * ```ts
     * const image = new Image(appContext);
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
     * ```ts
     * const image = new Image(appContext);
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
     * ```ts
     * const image = new Image(appContext);
     * image.imageDir = 'https://example.com/image.jpg';
     * // или
     * image.imageDir = '/path/to/image.jpg';
     * ```
     */
    public imageDir: string | null;

    /**
     * Флаг использования токена.
     * Если true, то imageDir используется как идентификатор.
     *
     * @type {boolean}
     * @default false
     * @example
     * ```ts
     * const image = new Image(appContext);
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
     * ```ts
     * const image = new Image(appContext);
     * image.params = {
     *     titleTypeface: 'headline2',
     *     titleText_color: 'default',
     *     descTypeface: 'body3',
     *     descText_color: 'secondary'
     * };
     * ```
     */
    public params: TImageParams;

    /**
     * Конструктор класса Image.
     * Инициализирует все свойства значениями по умолчанию.
     *
     * @param {AppContext} appContext - Контекст приложения.
     * ⚠️ Обычно НЕ создаётся вручную — автоматически передаётся через контроллер
     * @param {string | null} image - Путь к изображению или токен
     * @param {string} title - Заголовок изображения
     * @param {string} [desc=' '] - Описание изображения
     * @param {TButton | null} [button=null] - Кнопки для изображения
     */
    public constructor(
        appContext: AppContext,
        image: string | null = null,
        title: string = '',
        desc: string = ' ',
        button: TButton | null = null,
    ) {
        this.button = new Buttons(appContext);
        this.title = title;
        this.desc = desc;
        this.imageToken = null;
        this.imageDir = null;
        this.isToken = false;
        this.params = {} as TImageParams;
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
     * ```ts
     * const image = new Image(appContext);
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
        } else if (image && (Text.isUrl(image) || isFile(image))) {
                this.imageDir = image;
                this.imageToken = null;
            } else {
                this.imageToken = image;
            }
        if (title) {
            this.title = title;
            if (!desc) {
                this.desc = ' ';
            } else {
                this.desc = desc;
            }
            if (button) {
                initButton(button, this.button);
            }
            return true;
        }
        return false;
    }
}
