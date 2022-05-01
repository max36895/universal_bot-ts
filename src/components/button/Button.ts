import {IButtonOptions, TButtonPayload} from "./interfaces/IButton";
import {mmApp} from "../../core/mmApp";
import {Text} from "../standard";

/**
 * @class Button
 *
 * Класс для кнопки, которая будет отображаться пользователю
 * Тип кнопки(кнопка и сайджест) влияют только при отображении в навыках.
 * В Vk и Telegram кнопка инициируются автоматически. Так как все кнопки с ссылками должны быть в виде сайджест кнопки.
 */
export class Button {
    public static readonly B_LINK: boolean = false;
    public static readonly B_BTN: boolean = true;

    public static readonly VK_COLOR_PRIMARY = 'primary';
    public static readonly VK_COLOR_SECONDARY = 'secondary';
    public static readonly VK_COLOR_NEGATIVE = 'negative';
    public static readonly VK_COLOR_POSITIVE = 'positive';

    public static readonly VK_TYPE_TEXT = 'text';
    public static readonly VK_TYPE_LINK = 'open_link';
    public static readonly VK_TYPE_LOCATION = 'location';
    public static readonly VK_TYPE_PAY = 'vkpay';
    public static readonly VK_TYPE_APPS = 'open_app';

    /**
     * Тип кнопки.
     */
    public type: string | null;
    /**
     * Текст в кнопке.
     */
    public title: string | null;
    /**
     * Ссылка для перехода при нажатии на кнопку.
     */
    public url: string | null;
    /**
     * Произвольные данные, отправляемые при нажатии на кнопку.
     */
    public payload: TButtonPayload;
    /**
     * Определяет отображение кнопки как сайджеста.
     */
    public hide: boolean;
    /**
     * Дополнительные параметры кнопки.
     */
    public options: IButtonOptions;

    /**
     * Button constructor.
     */
    public constructor() {
        this.type = null;
        this.title = null;
        this.url = null;
        this.payload = [];
        this.hide = Button.B_LINK;
        this.options = {};
    }

    /**
     * Инициализация кнопки.
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода, при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {boolean} hide Определяет отображение кнопки как сайджеста.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     * @return boolean
     */
    private _init(title: string | null, url: string | null, payload: TButtonPayload, hide: boolean, options: IButtonOptions = {}): boolean {
        if (title || title === '') {
            this.title = title;
            if (url && Text.isUrl(url)) {
                if (mmApp.params.utm_text === null) {
                    if (!url.includes('utm_source')) {
                        url += `${url.includes('?') ? '&' : '?'}utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone`;
                    }
                } else if (mmApp.params.utm_text) {
                    url += (url.includes('?') ? '&' : '?') + mmApp.params.utm_text;
                }
            } else {
                url = null;
            }
            this.url = url;
            this.payload = payload;
            this.hide = hide;
            this.options = options;
            return true;
        }
        return false;
    }

    /**
     * Инициализация кнопки в виде сайджеста(ссылки под текстом).
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода, при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     * @return boolean
     * @api
     */
    public initLink(title: string | null, url: string | null = '', payload: TButtonPayload = null, options: IButtonOptions = {}): boolean {
        return this._init(title, url, payload, Button.B_LINK, options);
    }

    /**
     * Инициализация кнопки в виде кнопки.
     *
     * @param {string} title Текст в кнопке.
     * @param {string} url Ссылка для перехода, при нажатии на кнопку.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии на кнопку.
     * @param {IButtonOptions} options Дополнительные параметры кнопки
     * @return boolean
     * @api
     */
    public initBtn(title: string | null, url: string | null = '', payload: TButtonPayload = null, options: IButtonOptions = {}): boolean {
        return this._init(title, url, payload, Button.B_BTN, options);
    }
}
