import {Buttons} from "../button/Buttons";
import {TButton, TButtonPayload} from "../button/interfaces/button";
import {Text} from "../standard/Text";
import {is_file} from "../../utils/functins";

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
     * Название изображения.
     */
    public title: string;
    /**
     * Описание для изображения.
     */
    public desc: string;
    /**
     * Идентификатор изображения.
     */
    public imageToken: string;
    /**
     * Расположение изображения в сети/директории.
     */
    public imageDir: string;
    /**
     * True, если однозначно используется идентификатор/токен изображения. По умолчанию false.
     */
    public isToken: boolean;

    /**
     * Дополнительные параметры для изображения.
     */
    public params: any;

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
     * @param {string} title Заголовок для изображения.
     * @param {string} desc Описание для изображения.
     * @param {TButton} button Возможные кнопки для изображения.
     * @return boolean
     * @api
     */
    public init(image: string, title: string, desc: string = ' ', button: TButton = null): boolean {
        if (this.isToken) {
            this.imageToken = image;
        } else {
            if (image && (Text.isSayText(['http\:\/\/', 'https\:\/\/'], image) || is_file(image))) {
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
                    const title: string = (button.title || button.text || null);
                    const url: string = (button.url || null);
                    const payload: TButtonPayload = (button.payload || null);
                    this.button.addBtn(title, url, payload);
                }
            }
            return true;
        }
        return false;
    }
}
