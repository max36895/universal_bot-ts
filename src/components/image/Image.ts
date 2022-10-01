import {Buttons, TButton, TButtonPayload} from '../button';
import {Text, isFile} from '../../utils';
import {
    ISberSmartAppCardPadding,
    TSberSmartAppTextColor,
    TSberSmartAppTypeface
} from '../../platforms/interfaces';

export interface IImageParams {
    /**
     * Стиль верхнего текста
     */
    titleTypeface?: TSberSmartAppTypeface;
    /**
     * Цвет верхнего текста
     */
    titleText_color?: TSberSmartAppTextColor;
    /**
     * Отступы верхнего текста
     */
    titleMargins?: ISberSmartAppCardPadding;
    /**
     * Максимальное количество строк верхнего текста
     */
    titleMax_lines?: number;
    /**
     * Стиль нижнего текста
     */
    descTypeface?: TSberSmartAppTypeface;
    /**
     * Цвет нижнего текста
     */
    descText_color?: TSberSmartAppTextColor;
    /**
     * Отступы нижнего текста
     */
    descMargins?: ISberSmartAppCardPadding;
    /**
     * Максимальное количество строк нижнего текста
     */
    descMax_lines?: number;

    /**
     * Дополнительные параметры изображения
     */
    [name: string]: any;
}

/**
 * Класс отвечающий за обработку и корректное отображение изображения, в зависимости от типа приложения.
 * @class Image
 */
export class Image {
    /**
     * Кнопки, обрабатывающие действия на нажатие на изображение или кнопку (Зависит от типа приложения).
     * @see Buttons Смотри тут
     */
    public button: Buttons;
    /**
     * Заголовок изображения.
     */
    public title: string;
    /**
     * Описание изображения.
     */
    public desc: string;
    /**
     * Идентификатор изображения.
     */
    public imageToken: string | null;
    /**
     * Расположение изображения в сети/директории.
     */
    public imageDir: string | null;
    /**
     * True, если однозначно используется идентификатор/токен изображения. По умолчанию false.
     * Стоит указывать true в том случае, если в метод `init` передается токен изображения
     */
    public isToken: boolean;
    /**
     * Дополнительные параметры изображения.
     */
    public params: IImageParams;

    /**
     * Image constructor.
     */
    public constructor() {
        this.button = new Buttons();
        this.title = '';
        this.desc = '';
        this.imageToken = null;
        this.imageDir = null;
        this.isToken = false;
        this.params = {};
    }

    /**
     * Инициализация изображения.
     *
     * @param {string} image Путь до изображения в сети/папке. Либо идентификатор изображения.
     * @param {string} title Заголовок изображения.
     * @param {string} desc Описание изображения.
     * @param {TButton} button Возможные кнопки для изображения.
     * @return boolean
     * @api
     */
    public init(image: string | null, title: string, desc: string = ' ', button: TButton | null = null): boolean {
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
                if (typeof button === 'string') {
                    this.button.addBtn(button);
                } else {
                    const title: string | null = (button.title || button.text || null);
                    const url: string | null = (button.url || null);
                    const payload: TButtonPayload = (button.payload || null);
                    this.button.addBtn(title, url, payload);
                }
            }
            return true;
        }
        return false;
    }
}
