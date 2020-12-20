import {TButtonPayload} from "./interfaces/button";
import {mmApp} from "../../core/mmApp";

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
    public type: string;
    /**
     * Текст на кнопке.
     */
    public title: string;
    /**
     * Ссылка для перехода при нажатии кнопки.
     */
    public url: string;
    /**
     * Произвольные данные, отправляемые при нажатии кнопки.
     */
    public payload: TButtonPayload;
    /**
     * True, чтобы отображать кнопку как сайджест.
     */
    public hide: boolean;
    /**
     * Дополнительные параметры для кнопки.
     */
    public options: object;

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
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода, при нажатии кнопки.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @param {boolean} hide True, чтобы отображать кнопку как сайджест.
     * @return boolean
     */
    private _init(title: string, url: string, payload: TButtonPayload, hide: boolean): boolean {
        if (title || title == '') {
            this.title = title;
            if (url && !!url.match(/((http|s:\/\/)[^( |\n)]+)/umig)) {
                if (mmApp.params.utm_text === null) {
                    if (url.indexOf('utm_source') === -1) {
                        if (url.indexOf('?') !== -1) {
                            url += '&';
                        } else {
                            url += '?';
                        }
                        url += 'utm_source=Yandex_Alisa&utm_medium=cpc&utm_campaign=phone';
                    }
                } else if (mmApp.params.utm_text) {
                    if (url.indexOf('?') !== -1) {
                        url += '&';
                    } else {
                        url += '?';
                    }
                    url += mmApp.params.utm_text;
                }
            } else {
                url = null;
            }
            this.url = url;
            this.payload = payload;
            this.hide = hide;
            return true;
        }
        return false;
    }

    /**
     * Инициализация кнопки в виде сайджеста(ссылки под текстом).
     *
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода, при нажатии кнопки.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @return boolean
     * @api
     */
    public initLink(title: string, url: string = '', payload: TButtonPayload = null): boolean {
        return this._init(title, url, payload, Button.B_LINK);
    }

    /**
     * Инициализация кнопки в виде кнопки.
     *
     * @param {string} title Текст на кнопке.
     * @param {string} url Ссылка для перехода, при нажатии кнопки.
     * @param {TButtonPayload} payload Произвольные данные, отправляемые при нажатии кнопки.
     * @return boolean
     * @api
     */
    public initBtn(title: string, url: string = '', payload: TButtonPayload = null): boolean {
        return this._init(title, url, payload, Button.B_BTN);
    }
}
