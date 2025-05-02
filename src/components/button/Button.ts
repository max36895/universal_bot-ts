import { IButtonOptions, TButtonPayload } from './interfaces';
import { mmApp } from '../../mmApp';
import { Text } from '../../utils/standard/Text';

/**
 * @class Button
 *
 * Класс для кнопки, которая будет отображаться пользователю
 * Тип кнопки(кнопка и сайджест) влияют только при отображении в навыках.
 * В Vk и Telegram кнопка инициируются автоматически. Так как все кнопки ссылки должны быть в виде сайджест кнопки.
 */
export class Button {
    /**
     * Кнопка в виде ссылки.
     */
    public static readonly B_LINK: boolean = false;
    /**
     * Кнопка в виде кнопки.
     */
    public static readonly B_BTN: boolean = true;

    /**
     * Цвет кнопки primary в ВК.
     */
    public static readonly VK_COLOR_PRIMARY = 'primary';
    /**
     * Цвет кнопки secondary в ВК.
     */
    public static readonly VK_COLOR_SECONDARY = 'secondary';
    /**
     * Цвет кнопки negative в ВК.
     */
    public static readonly VK_COLOR_NEGATIVE = 'negative';
    /**
     * Цвет кнопки positive в ВК.
     */
    public static readonly VK_COLOR_POSITIVE = 'positive';

    /**
     * Тип кнопки текст
     */
    public static readonly VK_TYPE_TEXT = 'text';
    /**
     * Тип кнопки ссылка
     */
    public static readonly VK_TYPE_LINK = 'open_link';
    /**
     * Тип кнопки поделиться локацией
     */
    public static readonly VK_TYPE_LOCATION = 'location';
    /**
     * Тип кнопки оплатить
     */
    public static readonly VK_TYPE_PAY = 'vkpay';
    /**
     * Тип кнопки открыть приложение
     */
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
     * Возвращает разделитель для гет запросов
     * @param url
     * @private
     */
    private static _getUrlSeparator(url: string): string {
        return url.includes('?') ? '&' : '?';
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
    private _init(
        title: string | null,
        url: string | null,
        payload: TButtonPayload,
        hide: boolean,
        options: IButtonOptions = {},
    ): boolean {
        if (title || title === '') {
            this.title = title;
            if (url && Text.isUrl(url)) {
                if (mmApp.params.utm_text === null) {
                    if (!url.includes('utm_source')) {
                        url += `${Button._getUrlSeparator(url)}utm_source=umBot&utm_medium=cpc&utm_campaign=phone`;
                    }
                } else if (mmApp.params.utm_text) {
                    url += Button._getUrlSeparator(url) + mmApp.params.utm_text;
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
     */
    public initLink(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = null,
        options: IButtonOptions = {},
    ): boolean {
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
     */
    public initBtn(
        title: string | null,
        url: string | null = '',
        payload: TButtonPayload = null,
        options: IButtonOptions = {},
    ): boolean {
        return this._init(title, url, payload, Button.B_BTN, options);
    }
}
