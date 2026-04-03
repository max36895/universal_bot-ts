import { Buttons, TButton } from '../button';
import { Text, isFileSync } from '../../utils';
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
 * Интерфейс для обработки и отображения изображений в различных платформах.
 *
 * Основные возможности:
 * - Управление изображениями и их метаданными
 * - Поддержка различных источников изображений (URL, файлы, токены)
 * - Настройка отображения текста (заголовок и описание)
 * - Добавление кнопок и действий
 * - Гибкая настройка параметров отображения
 */
export interface IImageType<TImageParams extends IImageParams = IImageParams> {
    /**
     * Кнопки для обработки действий с изображением.
     * Зависит от типа приложения и платформы.
     *
     * @see Buttons
     * @example
     * ```ts
     * const image = getImage(...);
     * image.button.addBtn('Нажми меня', 'https://example.com');
     * image.button.addBtn('Другая кнопка', null, { action: 'custom' });
     * ```
     */
    button?: Buttons;

    /**
     * Заголовок изображения.
     * Отображается над изображением.
     *
     * @example
     * ```ts
     * const image = getImage(...);
     * image.title = 'Название товара';
     * ```
     */
    title: string;

    /**
     * Описание изображения.
     * Отображается под изображением.
     *
     * @example
     * ```ts
     * const image = getImage(...);
     * image.desc = 'Подробное описание товара';
     * ```
     */
    desc: string;

    /**
     * Идентификатор изображения.
     * Используется для платформ, поддерживающих токены.
     *
     * @example
     * ```ts
     * const image = getImage(...);
     * image.imageToken = 'image_token_123';
     * ```
     */
    imageToken: string | null;

    /**
     * Путь к изображению.
     * Может быть URL или путь к файлу.
     *
     * @example
     * ```ts
     * const image = getImage(...);
     * image.imageDir = 'https://example.com/image.jpg';
     * // или
     * image.imageDir = '/path/to/image.jpg';
     * ```
     */
    imageDir: string | null;

    /**
     * Дополнительные параметры изображения.
     * Настройки отображения для разных платформ.
     *
     * @example
     * ```ts
     * const image = getImage(...);
     * image.params = {
     *     titleTypeface: 'headline2',
     *     titleText_color: 'default',
     *     descTypeface: 'body3',
     *     descText_color: 'secondary'
     * };
     * ```
     */
    params: TImageParams;
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
 * @param {AppContext} [appContext] - Контекст приложения
 * @param {string | null} image - Путь к изображению или токен
 * @param {string} title - Заголовок изображения
 * @param {string} [desc=' '] - Описание изображения
 * @param {TButton | null} [button=null] - Кнопки для изображения
 * @param {boolean} isToken - Флаг, говорящий о том, что явно передается токен
 * @returns {IImageType | null} объект если инициализация успешна, null в противном случае
 *
 * @example
 * ```ts
 * // Инициализация с URL
 * getImage(
 *     'https://example.com/image.jpg',
 *     'Заголовок',
 *     'Описание',
 *     { title: 'Кнопка', url: 'https://example.com' },
 *     appContext
 * );
 *
 * // Инициализация с простой кнопкой
 * getImage(
 *     'https://example.com/image.jpg',
 *     'Заголовок',
 *     'Описание',
 *     'Текст кнопки',
 *     appContext
 * );
 * ```
 */
export function getImage(
    appContext: AppContext,
    image: string | null,
    title: string,
    desc: string = ' ',
    button: TButton | null = null,
    isToken: boolean = false,
): IImageType | null {
    const res: IImageType = {
        imageToken: image,
        imageDir: null,
        title: '',
        desc: '',
        params: {},
    };
    if (!isToken && image && (Text.isUrl(image) || isFileSync(image))) {
        res.imageDir = image;
        res.imageToken = null;
    }
    if (image || title) {
        res.title = title || '';
        res.desc = desc || '';
        if (button) {
            res.button = new Buttons(appContext);
            initButton(button, res.button);
        }
        return res;
    }
    return null;
}
